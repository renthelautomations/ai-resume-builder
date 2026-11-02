-- Telegram purchase approval support.
-- Run this in Supabase SQL Editor after schema.sql.
-- The Telegram webhook uses the server-only service_role key.

CREATE OR REPLACE FUNCTION public.approve_subscription(p_subscription_id UUID)
RETURNS void AS $$
DECLARE
    v_user_id UUID;
    v_credits INT;
    v_status TEXT;
    v_request_role TEXT;
BEGIN
    v_request_role := COALESCE(
        NULLIF(current_setting('request.jwt.claim.role', true), ''),
        NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
    );

    IF auth.uid() IS DISTINCT FROM 'b0b909eb-4831-445a-9622-733a1d823f35'::uuid
       AND v_request_role IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'Unauthorized - Admin Only';
    END IF;

    SELECT user_id, credits_amount, status
    INTO v_user_id, v_credits, v_status
    FROM public.credit_subscriptions
    WHERE id = p_subscription_id
    FOR UPDATE;

    IF v_status = 'pending' THEN
        UPDATE public.credit_subscriptions
        SET status = 'approved'
        WHERE id = p_subscription_id;

        UPDATE public.profiles
        SET credits = COALESCE(credits, 0) + v_credits
        WHERE id = v_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.reject_subscription(p_subscription_id UUID)
RETURNS void AS $$
DECLARE
    v_status TEXT;
    v_request_role TEXT;
BEGIN
    v_request_role := COALESCE(
        NULLIF(current_setting('request.jwt.claim.role', true), ''),
        NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
    );

    IF auth.uid() IS DISTINCT FROM 'b0b909eb-4831-445a-9622-733a1d823f35'::uuid
       AND v_request_role IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'Unauthorized - Admin Only';
    END IF;

    SELECT status
    INTO v_status
    FROM public.credit_subscriptions
    WHERE id = p_subscription_id
    FOR UPDATE;

    IF v_status = 'pending' THEN
        UPDATE public.credit_subscriptions
        SET status = 'rejected', acknowledged = TRUE
        WHERE id = p_subscription_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
