export const getCompactPageItems = (currentPage, pageCount) => {
  const page = Math.min(Math.max(1, currentPage), pageCount);
  if (pageCount <= 7)
    return Array.from(
      {
        length: pageCount,
      },
      (_, index) => ({
        type: "page",
        value: index + 1,
      }),
    );
  if (page <= 3)
    return [
      1,
      2,
      3,
      {
        type: "ellipsis",
        key: "end",
      },
      pageCount,
    ].map((value) =>
      typeof value === "number"
        ? {
            type: "page",
            value,
          }
        : value,
    );
  if (page >= pageCount - 2)
    return [
      1,
      {
        type: "ellipsis",
        key: "start",
      },
      pageCount - 2,
      pageCount - 1,
      pageCount,
    ].map((value) =>
      typeof value === "number"
        ? {
            type: "page",
            value,
          }
        : value,
    );
  return [
    1,
    {
      type: "ellipsis",
      key: "start",
    },
    page - 1,
    page,
    page + 1,
    {
      type: "ellipsis",
      key: "end",
    },
    pageCount,
  ].map((value) =>
    typeof value === "number"
      ? {
          type: "page",
          value,
        }
      : value,
  );
};
