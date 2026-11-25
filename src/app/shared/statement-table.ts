import { Component, input } from '@angular/core';
import { StatementLine } from '../core/models';
import { formatBrl, formatWhen, movementLabel, signedAmount } from '../core/money';

@Component({
  selector: 'app-statement-table',
  templateUrl: './statement-table.html',
})
export class StatementTable {
  readonly lines = input.required<StatementLine[]>();
  readonly emptyText = input('No movements yet.');
  protected readonly formatWhen = formatWhen;
  protected readonly formatBrl = formatBrl;
  protected readonly movementLabel = movementLabel;
  protected readonly signedAmount = signedAmount;
}
