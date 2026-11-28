-- Hata defteri: günlük / haftalık / aylık. Ham satır 62 gün kalır.

CREATE OR REPLACE FUNCTION public.archive_app_issue_notes()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current text := to_char(timezone('Europe/Istanbul', now()), 'YYYY-MM');
  v_month text;
  v_archived int := 0;
  v_count int;
BEGIN
  FOR v_month IN
    SELECT DISTINCT to_char(
      timezone('Europe/Istanbul', n.created_at),
      'YYYY-MM'
    ) AS mk
    FROM public.app_issue_notes n
    WHERE to_char(timezone('Europe/Istanbul', n.created_at), 'YYYY-MM')
          < v_current
    ORDER BY 1
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.app_issue_month_stats s WHERE s.month_key = v_month
    ) THEN
      INSERT INTO public.app_issue_month_stats (
        month_key, kind, area, code, n, users, last_at
      )
      SELECT
        v_month,
        n.kind,
        n.area,
        n.code,
        count(*)::int,
        count(DISTINCT n.user_id)::int,
        max(n.created_at)
      FROM public.app_issue_notes n
      WHERE to_char(timezone('Europe/Istanbul', n.created_at), 'YYYY-MM') = v_month
      GROUP BY n.kind, n.area, n.code;
    END IF;
  END LOOP;

  DELETE FROM public.app_issue_notes n
  WHERE n.created_at < (timezone('utc', now()) - interval '62 days');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_archived := v_count;
  RETURN v_archived;
END;
$$;

DROP FUNCTION IF EXISTS public.admin_issue_notebook(text);

CREATE OR REPLACE FUNCTION public.admin_issue_notebook(
  p_grain text DEFAULT 'day',
  p_period text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grain text;
  v_period text;
  v_start timestamptz;
  v_end timestamptz;
  v_prev_start timestamptz;
  v_prev_end timestamptz;
  v_prev text;
  v_current_day text := to_char(timezone('Europe/Istanbul', now()), 'YYYY-MM-DD');
  v_current_week text := to_char(
    date_trunc('week', timezone('Europe/Istanbul', now())),
    'YYYY-MM-DD'
  );
  v_current_month text := to_char(timezone('Europe/Istanbul', now()), 'YYYY-MM');
  v_archived boolean := false;
  v_this_total int := 0;
  v_prev_total int := 0;
  v_periods jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not admin';
  END IF;

  PERFORM public.archive_app_issue_notes();

  v_grain := lower(nullif(trim(coalesce(p_grain, '')), ''));
  IF v_grain IS NULL OR v_grain NOT IN ('day', 'week', 'month') THEN
    v_grain := 'day';
  END IF;
  v_period := nullif(trim(coalesce(p_period, '')), '');

  IF v_grain = 'day' THEN
    IF v_period IS NULL OR v_period !~ '^\d{4}-\d{2}-\d{2}$' THEN
      v_period := v_current_day;
    END IF;
    v_start := v_period::timestamp AT TIME ZONE 'Europe/Istanbul';
    v_end := v_start + interval '1 day';
    v_prev_start := v_start - interval '1 day';
    v_prev_end := v_start;
    v_prev := to_char(v_prev_start AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD');
    v_periods := COALESCE((
      SELECT jsonb_agg(d.dk ORDER BY d.dk DESC)
      FROM (
        SELECT v_current_day AS dk
        UNION
        SELECT DISTINCT to_char(
          timezone('Europe/Istanbul', created_at),
          'YYYY-MM-DD'
        )
        FROM public.app_issue_notes
      ) d
    ), jsonb_build_array(v_current_day));
  ELSIF v_grain = 'week' THEN
    IF v_period IS NULL OR v_period !~ '^\d{4}-\d{2}-\d{2}$' THEN
      v_period := v_current_week;
    ELSE
      v_period := to_char(date_trunc('week', v_period::timestamp), 'YYYY-MM-DD');
    END IF;
    v_start := v_period::timestamp AT TIME ZONE 'Europe/Istanbul';
    v_end := v_start + interval '7 days';
    v_prev_start := v_start - interval '7 days';
    v_prev_end := v_start;
    v_prev := to_char(v_prev_start AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD');
    v_periods := COALESCE((
      SELECT jsonb_agg(w.wk ORDER BY w.wk DESC)
      FROM (
        SELECT v_current_week AS wk
        UNION
        SELECT DISTINCT to_char(
          date_trunc('week', timezone('Europe/Istanbul', created_at)),
          'YYYY-MM-DD'
        )
        FROM public.app_issue_notes
      ) w
    ), jsonb_build_array(v_current_week));
  ELSE
    IF v_period IS NULL OR v_period !~ '^\d{4}-\d{2}$' THEN
      v_period := v_current_month;
    END IF;
    v_start := (v_period || '-01')::timestamp AT TIME ZONE 'Europe/Istanbul';
    v_end := v_start + interval '1 month';
    v_prev_start := v_start - interval '1 month';
    v_prev_end := v_start;
    v_prev := to_char(v_prev_start AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM');
    v_archived := v_period < v_current_month;
    v_periods := COALESCE((
      SELECT jsonb_agg(m.mk ORDER BY m.mk DESC)
      FROM (
        SELECT DISTINCT month_key AS mk FROM public.app_issue_month_stats
        UNION
        SELECT v_current_month
        UNION
        SELECT DISTINCT to_char(
          timezone('Europe/Istanbul', created_at),
          'YYYY-MM'
        )
        FROM public.app_issue_notes
      ) m
    ), jsonb_build_array(v_current_month));
  END IF;

  IF v_archived THEN
    SELECT COALESCE(sum(s.n), 0)::int INTO v_this_total
    FROM public.app_issue_month_stats s
    WHERE s.month_key = v_period;
    SELECT COALESCE(sum(s.n), 0)::int INTO v_prev_total
    FROM public.app_issue_month_stats s
    WHERE s.month_key = v_prev;
  ELSE
    SELECT count(*)::int INTO v_this_total
    FROM public.app_issue_notes n
    WHERE n.created_at >= v_start AND n.created_at < v_end;
    SELECT count(*)::int INTO v_prev_total
    FROM public.app_issue_notes n
    WHERE n.created_at >= v_prev_start AND n.created_at < v_prev_end;
  END IF;

  IF v_archived AND v_prev_total = 0 THEN
    SELECT count(*)::int INTO v_prev_total
    FROM public.app_issue_notes n
    WHERE n.created_at >= v_prev_start AND n.created_at < v_prev_end;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'grain', v_grain,
    'period', v_period,
    'prev_period', v_prev,
    'archived', v_archived,
    'total', v_this_total,
    'prev_total', v_prev_total,
    'periods', v_periods,
    'groups', CASE
      WHEN v_archived THEN COALESCE((
        SELECT jsonb_agg(row_to_json(g)::jsonb ORDER BY g.n DESC, g.last_at DESC NULLS LAST)
        FROM (
          SELECT
            s.kind,
            s.area,
            s.code,
            s.n,
            s.users,
            s.last_at,
            COALESCE((
              SELECT p.n FROM public.app_issue_month_stats p
              WHERE p.month_key = v_prev
                AND p.kind = s.kind
                AND p.area = s.area
                AND p.code = s.code
            ), 0) AS prev_n
          FROM public.app_issue_month_stats s
          WHERE s.month_key = v_period
          ORDER BY s.n DESC, s.last_at DESC NULLS LAST
          LIMIT 40
        ) g
      ), '[]'::jsonb)
      ELSE COALESCE((
        SELECT jsonb_agg(row_to_json(g)::jsonb ORDER BY g.n DESC, g.last_at DESC)
        FROM (
          SELECT
            n.kind,
            n.area,
            n.code,
            count(*)::int AS n,
            count(DISTINCT n.user_id)::int AS users,
            max(n.created_at) AS last_at,
            (
              SELECT count(*)::int
              FROM public.app_issue_notes p
              WHERE p.created_at >= v_prev_start
                AND p.created_at < v_prev_end
                AND p.kind = n.kind
                AND p.area = n.area
                AND p.code = n.code
            ) AS prev_n
          FROM public.app_issue_notes n
          WHERE n.created_at >= v_start AND n.created_at < v_end
          GROUP BY n.kind, n.area, n.code
          ORDER BY count(*) DESC, max(n.created_at) DESC
          LIMIT 40
        ) g
      ), '[]'::jsonb)
    END,
    'recent', CASE
      WHEN v_archived THEN '[]'::jsonb
      ELSE COALESCE((
        SELECT jsonb_agg(row_to_json(r)::jsonb ORDER BY r.created_at DESC)
        FROM (
          SELECT
            n.id,
            n.created_at,
            n.kind,
            n.area,
            n.code,
            n.note,
            n.user_id,
            p.full_name,
            p.username
          FROM public.app_issue_notes n
          LEFT JOIN public.profiles p ON p.id = n.user_id
          WHERE n.created_at >= v_start AND n.created_at < v_end
          ORDER BY n.created_at DESC
          LIMIT 80
        ) r
      ), '[]'::jsonb)
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_issue_notebook(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_issue_notebook(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_issue_notebook(text, text) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_issue_notebook_people(text, text, text, text);

CREATE OR REPLACE FUNCTION public.admin_issue_notebook_people(
  p_grain text,
  p_period text,
  p_kind text,
  p_area text,
  p_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grain text;
  v_period text;
  v_start timestamptz;
  v_end timestamptz;
  v_kind text;
  v_area text;
  v_code text;
  v_current_month text := to_char(timezone('Europe/Istanbul', now()), 'YYYY-MM');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not admin';
  END IF;

  v_grain := lower(nullif(trim(coalesce(p_grain, '')), ''));
  IF v_grain IS NULL OR v_grain NOT IN ('day', 'week', 'month') THEN
    v_grain := 'day';
  END IF;
  v_period := nullif(trim(coalesce(p_period, '')), '');
  v_kind := nullif(trim(coalesce(p_kind, '')), '');
  v_area := nullif(trim(coalesce(p_area, '')), '');
  v_code := nullif(trim(coalesce(p_code, '')), '');
  IF v_kind IS NULL OR v_area IS NULL OR v_code IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  IF v_grain = 'month' THEN
    IF v_period IS NULL OR v_period !~ '^\d{4}-\d{2}$' THEN
      v_period := v_current_month;
    END IF;
    IF v_period < v_current_month THEN
      RETURN jsonb_build_object(
        'ok', true,
        'archived', true,
        'grain', v_grain,
        'period', v_period,
        'kind', v_kind,
        'area', v_area,
        'code', v_code,
        'affected', 0,
        'listed', 0,
        'not_listed', 0,
        'people', '[]'::jsonb
      );
    END IF;
    v_start := (v_period || '-01')::timestamp AT TIME ZONE 'Europe/Istanbul';
    v_end := v_start + interval '1 month';
  ELSIF v_grain = 'week' THEN
    IF v_period IS NULL OR v_period !~ '^\d{4}-\d{2}-\d{2}$' THEN
      v_period := to_char(
        date_trunc('week', timezone('Europe/Istanbul', now())),
        'YYYY-MM-DD'
      );
    ELSE
      v_period := to_char(date_trunc('week', v_period::timestamp), 'YYYY-MM-DD');
    END IF;
    v_start := v_period::timestamp AT TIME ZONE 'Europe/Istanbul';
    v_end := v_start + interval '7 days';
  ELSE
    IF v_period IS NULL OR v_period !~ '^\d{4}-\d{2}-\d{2}$' THEN
      v_period := to_char(timezone('Europe/Istanbul', now()), 'YYYY-MM-DD');
    END IF;
    v_start := v_period::timestamp AT TIME ZONE 'Europe/Istanbul';
    v_end := v_start + interval '1 day';
  END IF;

  RETURN (
    WITH affected AS (
      SELECT
        n.user_id,
        count(*)::int AS hits,
        max(n.created_at) AS last_at
      FROM public.app_issue_notes n
      WHERE n.created_at >= v_start
        AND n.created_at < v_end
        AND n.kind = v_kind
        AND n.area = v_area
        AND n.code = v_code
      GROUP BY n.user_id
    ),
    listing_counts AS (
      SELECT x.user_id, count(*)::int AS listing_count
      FROM (
        SELECT user_id FROM public.listings
        UNION ALL
        SELECT user_id FROM public.kiralik_listings
        UNION ALL
        SELECT user_id FROM public.galeri_listings
        UNION ALL
        SELECT user_id FROM public.expertiz_listings
        UNION ALL
        SELECT user_id FROM public.parcaci_listings
      ) x
      WHERE x.user_id IN (SELECT user_id FROM affected)
      GROUP BY x.user_id
    ),
    people AS (
      SELECT
        a.user_id,
        p.full_name,
        p.username,
        p.email,
        a.hits,
        a.last_at,
        COALESCE(lc.listing_count, 0) AS listing_count,
        (COALESCE(lc.listing_count, 0) > 0) AS has_listing
      FROM affected a
      LEFT JOIN public.profiles p ON p.id = a.user_id
      LEFT JOIN listing_counts lc ON lc.user_id = a.user_id
    )
    SELECT jsonb_build_object(
      'ok', true,
      'archived', false,
      'grain', v_grain,
      'period', v_period,
      'kind', v_kind,
      'area', v_area,
      'code', v_code,
      'affected', (SELECT count(*)::int FROM people),
      'listed', (SELECT count(*)::int FROM people WHERE has_listing),
      'not_listed', (SELECT count(*)::int FROM people WHERE NOT has_listing),
      'people', COALESCE((
        SELECT jsonb_agg(row_to_json(r)::jsonb ORDER BY r.has_listing, r.hits DESC, r.last_at DESC)
        FROM (
          SELECT *
          FROM people
          ORDER BY has_listing, hits DESC, last_at DESC
          LIMIT 300
        ) r
      ), '[]'::jsonb)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_issue_notebook_people(text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_issue_notebook_people(text, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_issue_notebook_people(text, text, text, text, text) TO authenticated;

COMMENT ON FUNCTION public.admin_issue_notebook(text, text) IS
  'Admin hata defteri. p_grain: day|week|month. p_period: YYYY-MM-DD veya YYYY-MM.';
COMMENT ON FUNCTION public.admin_issue_notebook_people(text, text, text, text, text) IS
  'Admin hata defteri kişi listesi. Aynı grain/period ile.';
