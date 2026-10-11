export function pageOptions(query: { page?: number; limit?: number }) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 25;
  return { skip: (page - 1) * limit, take: limit };
}
export function paginate<T>(
  items: T[],
  query: { page?: number; limit?: number },
) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 25;
  return {
    items: items.slice((page - 1) * limit, page * limit),
    total: items.length,
    page,
    limit,
  };
}
