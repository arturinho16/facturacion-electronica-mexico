type FolioRecord = { folio: string };

export function formatFolio(value: number) {
  return String(value).padStart(2, '0');
}

export function getNextFolioFromRecords(records: FolioRecord[]) {
  const max = records.reduce((currentMax, record) => {
    const numeric = Number.parseInt(String(record.folio || '').replace(/\D/g, ''), 10);
    return Number.isFinite(numeric) && numeric > currentMax ? numeric : currentMax;
  }, 0);

  return formatFolio(max + 1);
}
