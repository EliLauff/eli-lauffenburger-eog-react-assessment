import React from 'react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TransformedMetricNode } from './Dashboard';

const setToUnique = (units: string[]) => {
  return units.filter((value, index) => {
    return units.indexOf(value) === index;
  });
};

export default (props: { data: any; selectedMetrics: TransformedMetricNode[] }) => {
  const { data, selectedMetrics } = props;
  let selectedUnits: string[] = [];
  if (selectedMetrics) {
    selectedUnits = setToUnique(selectedMetrics.map((metricNode: { unit: string }) => metricNode.unit));
  }
  console.log(data);
  console.log('in render');
  console.log(selectedMetrics);
  console.log(selectedUnits);
  return (
    <ResponsiveContainer width="100%" height={450}>
      <LineChart data={data}>
        <CartesianGrid stroke="3" />
        <XAxis name="time" dataKey="time" allowDuplicatedCategory={false} />
        {selectedUnits.map(unit => {
          return <YAxis key={unit} yAxisId={unit} unit={unit} />;
        })}
        <Tooltip />
        <Legend />
        {selectedMetrics.map(metricNode => {
          return (
            <Line
              key={metricNode.metric}
              type="monotone"
              dataKey={metricNode.metric}
              stroke={metricNode.stroke}
              yAxisId={metricNode.unit}
              unit={metricNode.unit}
              dot={false}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
};
