import type { WrongItem } from '../../../lib/wrongbook';

export type RedoPayload<K extends WrongItem['payload']['kind']> = Extract<
  WrongItem['payload'],
  { kind: K }
>;

export interface RedoProps<K extends WrongItem['payload']['kind']> {
  payload: RedoPayload<K>;
  onGrade: (correct: boolean) => void;
}
