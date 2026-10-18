import { everydayReadersA } from "./everyday-a";
import { everydayReadersB } from "./everyday-b";
import { expansionReadersA } from "./expansion-a";
import { expansionReadersB } from "./expansion-b";

export const readers = [...everydayReadersA, ...everydayReadersB, ...expansionReadersA, ...expansionReadersB];
export const readerById = new Map(readers.map(reader => [reader.id, reader]));
