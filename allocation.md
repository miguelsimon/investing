This runs simulations on historical data to backtest a simple investment strategy:
1. we buy 1 constant dollars of a portfolio on `day=d`
2. we wait for `holding_time` days
3. we sell the portfolio on `day=d + holding_time` and calculate its value in constant dollars

The chart plots the percentage profit/loss for each portfolio at each day's simulation start:

```
y(day=d, portfolio) = 100 * (value_constant_usd(day=d + holding_time, portfolio) - 1)
```
