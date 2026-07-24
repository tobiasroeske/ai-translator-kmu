export const AUTH_ERROR = 'AUTH_EXPIRED';

export const fetchWithAuthError: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);
  if (response.status === 401) {
    throw new Error(AUTH_ERROR);
  }
  return response;
};
