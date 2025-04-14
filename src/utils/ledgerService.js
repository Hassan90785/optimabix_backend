// services/ledgerService.js

import {Ledger} from "../models/index.js";
import {v4 as uuidv4} from 'uuid';

export async function createDoubleLedgerEntry({
                                                  transactionId,
                                                  companyId,
                                                  transactionType,
                                                  referenceType,
                                                  date = new Date(),
                                                  description,
                                                  debitAccount,
                                                  debitAmount,
                                                  creditAccount,
                                                  creditAmount,
                                                  linkedEntityId = null,
                                                  invoiceId = null,
                                                  accountId = null,
                                                  createdBy
                                              }) {
    if (debitAmount !== creditAmount) {
        throw new Error('Debit and credit amounts must match for double-entry.');
    }
    const entryGroupId = uuidv4();
    const entries = await Ledger.insertMany([
        {
            transactionId,
            companyId,
            transactionType,
            referenceType,
            date,
            description,
            account: debitAccount,
            entryType: 'debit',
            amount: debitAmount,
            linkedEntityId,
            invoiceId,
            entryGroupId: entryGroupId,
            accountId,
            createdBy
        },
        {
            transactionId,
            companyId,
            transactionType,
            referenceType,
            date,
            description,
            account: creditAccount,
            entryType: 'credit',
            amount: creditAmount,
            linkedEntityId,
            invoiceId,
            accountId,
            entryGroupId: entryGroupId,
            createdBy
        }
    ]);

    return entries;
}
