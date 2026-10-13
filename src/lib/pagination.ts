/** A page of results, shared by the real and demonstration data paths. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
}
