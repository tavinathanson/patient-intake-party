import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FIELDS, PAST_CONDITIONS, type FieldKey } from './intake-form.model';
import { guessAll, toIntakeJson, type Chaos, type Guess } from './guesser';
import { readPhoto, type PhotoSignals } from './image-read';
import { IntakeForm, type Row } from './intake-form/intake-form';

interface Sample {
  label: string;
  file: string;
}

const SAMPLES: readonly Sample[] = [
  { label: 'pill bottle', file: 'pill-bottle.jpg' },
  { label: 'a rash', file: 'elbow-photo.png' },
  { label: 'mystery pen', file: 'pen-photo.jpg' },
  { label: 'an old x-ray', file: 'xray-2021.jpg' },
  { label: 'an eye scan', file: 'optic-disc-2023.png' },
];

const CHAOS_LABELS: Record<Chaos, string> = {
  1: 'Plausible',
  2: 'Confident',
  3: 'Unwell',
};

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  imports: [IntakeForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly destroyRef = inject(DestroyRef);

  protected readonly samples = SAMPLES;
  protected readonly fieldCount = FIELDS.length;

  protected readonly photoUrl = signal<string | null>(null);
  protected readonly photoName = signal('');
  protected readonly signals = signal<PhotoSignals | null>(null);
  protected readonly chaos = signal<Chaos>(1);
  protected readonly error = signal('');
  protected readonly revealed = signal(0);
  protected readonly copied = signal(false);

  /** Bumped per field by the 🎲 button so one field re-rolls without moving the others. */
  private readonly nonces = signal<Partial<Record<FieldKey, number>>>({});
  /** Whatever a human has typed over the top of a guess. */
  private readonly overrides = signal<Partial<Record<FieldKey, string | string[]>>>({});

  private readonly guesses = computed<Guess[]>(() => {
    const signals = this.signals();
    return signals ? guessAll(signals, this.chaos(), this.nonces()) : [];
  });

  protected readonly rows = computed<Row[]>(() => {
    const overrides = this.overrides();
    return this.guesses().map((guess, index) => {
      const override = overrides[guess.key];
      return {
        def: FIELDS[index]!,
        guess,
        value: typeof override === 'string' ? override : guess.value,
        conditions: Array.isArray(override) ? override : (guess.conditions ?? []),
        edited: override !== undefined,
      };
    });
  });

  protected readonly chaosLabel = computed(() => CHAOS_LABELS[this.chaos()]);

  protected readonly verdict = computed(() => {
    const signals = this.signals();
    if (!signals) return '';
    const seen = signals.decoded
      ? `${signals.w}×${signals.h}, dominant hue ${signals.hex}, mean brightness ${signals.brightness}%`
      : `${signals.kb} kB that your browser could not open`;
    return `Read ${seen}. Completed ${this.fieldCount} of ${this.fieldCount} fields.`;
  });

  protected async onFile(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) await this.analyse(file);
  }

  protected async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) await this.analyse(file);
  }

  protected async useSample(sample: Sample): Promise<void> {
    try {
      const response = await fetch(`samples/${sample.file}`);
      if (!response.ok) throw new Error(String(response.status));
      const blob = await response.blob();
      await this.analyse(new File([blob], sample.file, { type: blob.type }));
    } catch {
      this.error.set(`Could not load the ${sample.label} sample.`);
    }
  }

  /** Re-seed everything: same photo, entirely new opinions. */
  protected guessAgain(): void {
    const bump = (this.nonces()['name'] ?? 0) + 1;
    this.nonces.set(Object.fromEntries(FIELDS.map((field) => [field.key, bump])));
    this.overrides.set({});
    this.cascade();
  }

  protected reroll(key: FieldKey): void {
    this.nonces.update((nonces) => ({ ...nonces, [key]: (nonces[key] ?? 0) + 1 }));
    this.overrides.update(({ [key]: _dropped, ...rest }) => rest);
  }

  protected setChaos(event: Event): void {
    this.chaos.set(Number((event.target as HTMLInputElement).value) as Chaos);
    this.overrides.set({});
    this.cascade();
  }

  protected onEdit({ key, value }: { key: FieldKey; value: string }): void {
    this.overrides.update((overrides) => ({ ...overrides, [key]: value }));
  }

  protected onToggleCondition({ key, condition }: { key: FieldKey; condition: string }): void {
    const current = this.rows().find((row) => row.def.key === key)?.conditions ?? [];
    const order = (label: string) => (PAST_CONDITIONS as readonly string[]).indexOf(label);
    const next = current.includes(condition)
      ? current.filter((entry) => entry !== condition)
      : [...current, condition].sort((a, b) => order(a) - order(b));
    this.overrides.update((overrides) => ({ ...overrides, [key]: next }));
  }

  protected async copyJson(): Promise<void> {
    const json = toIntakeJson(
      this.rows().map((row) => ({
        ...row.guess,
        value: row.value,
        conditions: row.guess.conditions ? row.conditions : undefined,
      })),
    );
    try {
      await navigator.clipboard.writeText(json);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1600);
    } catch {
      this.error.set('Clipboard refused. The form is still right there.');
    }
  }

  protected print(): void {
    window.print();
  }

  private async analyse(file: File): Promise<void> {
    this.error.set('');
    this.revealed.set(0);
    this.overrides.set({});
    this.nonces.set({});

    const previous = this.photoUrl();
    if (previous) URL.revokeObjectURL(previous);
    this.photoUrl.set(URL.createObjectURL(file));
    this.photoName.set(file.name);

    try {
      this.signals.set(await readPhoto(file));
      this.cascade();
    } catch {
      this.error.set('That file defeated us, which has never happened before.');
    }
  }

  /** Reveal the fields one at a time. It gets worse as it goes; that's the fun. */
  private cascade(): void {
    this.revealed.set(0);
    const timer = setInterval(() => {
      this.revealed.update((count) => count + 1);
      if (this.revealed() >= this.fieldCount) clearInterval(timer);
    }, 45);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }
}
