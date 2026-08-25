// Extracts a single displayable message from an Axios error.
// Falls back gracefully if the response has no body (network error, CORS, etc).
export const getErrorMessage = (err, fallback = 'Something went wrong. Try again.') => {
  return err.response?.data?.message || fallback;
};

// Extracts field-level errors as { fieldName: message }, for forms that
// want to show errors inline under each input instead of one banner.
export const getFieldErrors = (err) => {
  const details = err.response?.data?.details;
  if (!Array.isArray(details)) return {};
  return details.reduce((acc, d) => {
    acc[d.field] = d.message;
    return acc;
  }, {});
};