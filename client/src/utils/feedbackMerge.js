function idOf(item) {
  return String(item?.id ?? item?._id ?? '');
}

function timeOf(item) {
  const value = Date.parse(item?.createdAt);
  return Number.isFinite(value) ? value : 0;
}

export function normalizeFeedback(items, limit = Infinity) {
  if (!Array.isArray(items)) return [];

  const unique = new Map();

  for (const item of items) {
    const id = idOf(item);

    if (id && !unique.has(id)) unique.set(id, item);
  }

  return [...unique.values()]
    .sort((a, b) => timeOf(b) - timeOf(a) || (idOf(a) < idOf(b) ? 1 : idOf(a) > idOf(b) ? -1 : 0))
    .slice(0, limit);
}

function sameList(a, b) {
  return (
    a.length === b.length &&
    a.every(
      (item, index) =>
        idOf(item) === idOf(b[index]) &&
        item.name === b[index].name &&
        item.story === b[index].story &&
        item.updatedAt === b[index].updatedAt
    )
  );
}

export function mergeFeedback(current, incoming, limit = Infinity) {
  const next = normalizeFeedback(incoming, limit);
  return Array.isArray(current) && sameList(current, next) ? current : next;
}
