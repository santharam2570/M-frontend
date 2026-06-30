interface TimelineData {
  from_data?: string
  to_data?: string
  category_name: string
  action: string
  associate_to: string
  associate_id: string
  via?: string
  extra_info?: string
  text_info?: string
  title?: string
}

export const useTimeline = () => {
  // The backend does not expose a `/timeline` endpoint (it returns 404 on the
  // CORS preflight), so we intentionally skip the network request here. The
  // function is kept as a no-op so existing call sites continue to work and
  // optimistic UI updates remain in place.
  const addTimelineActivity = async (_data: TimelineData) => {
    return null
  }

  return { addTimelineActivity }
}