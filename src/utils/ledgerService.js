// services/ledgerService.js

import {Ledger} from "../models/index.js";

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
            createdBy
        }
    ]);

    return entries;
}
