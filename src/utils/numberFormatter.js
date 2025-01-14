import numeral from 'numeral';

const formatCurrency = (amount) => {
    return numeral(amount).format('$0,0.00');
};

export default formatCurrency;
