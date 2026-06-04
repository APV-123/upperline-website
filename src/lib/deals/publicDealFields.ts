export const PUBLIC_DEAL_SELECT = `
  id,
  name,
  raise_id,
  target_amount,
  location,
  asset_class,
  strategy,
  estimated_closing_date,
  why_we_like_it,
  overview_text,
  business_plan_text,
  created_at,

  image_1_url,
  image_2_url,
  image_3_url,

  pitch_book_url,
  abridged_memo_url,
  full_memo_url,
  full_memo_requires_ca,

  deal_highlights (
    id,
    title,
    description,
    display_order,
    is_visible
  ),

  deal_metrics (
    key,
    value,
    section,
    display_order,
    is_visible
  )
`;