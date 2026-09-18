import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { PAST_CONDITIONS, type FieldDef, type FieldKey } from '../intake-form.model';
import type { Guess } from '../guesser';

export interface Row {
  def: FieldDef;
  guess: Guess;
  value: string;
  conditions: string[];
  edited: boolean;
}

@Component({
  selector: 'app-intake-form',
  templateUrl: './intake-form.html',
  styleUrl: './intake-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IntakeForm {
  readonly rows = input.required<readonly Row[]>();
  /** How many rows have been revealed by the cascade so far. */
  readonly revealed = input.required<number>();

  readonly edit = output<{ key: FieldKey; value: string }>();
  readonly toggleCondition = output<{ key: FieldKey; condition: string }>();
  readonly reroll = output<FieldKey>();

  protected readonly allConditions = PAST_CONDITIONS;

  protected onInput(key: FieldKey, event: Event): void {
    this.edit.emit({ key, value: (event.target as HTMLInputElement | HTMLTextAreaElement).value });
  }

  /** Anything the banks invented beyond the 14 printed boxes, e.g. "Other: 'nerves'". */
  protected writeIns(row: Row): string[] {
    return row.conditions.filter((c) => !(PAST_CONDITIONS as readonly string[]).includes(c));
  }
}
