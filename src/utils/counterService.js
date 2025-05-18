import Counter from '../models/counter.model.js';

export const getNextSequence = async (name, companyId, session = null) => {
    const counter = await Counter.findOneAndUpdate(
        { name, companyId },
        { $inc: { seq: 1 } },
        {
            new: true,
            upsert: true,
            session
        }
    );

    return counter.seq;
};
