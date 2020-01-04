import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Card, CardContent } from '@material-ui/core';
import DashHeader from './DashHeader';
import Chart from './Chart';
import { gql } from 'apollo-boost';
import { client } from '../App';

const useStyles = makeStyles({
  card: {
    margin: '5% 10%',
  },
  taskBar: {
    backgroundColor: 'silver',
  },
});

// query {
//   getMultipleMeasurements(input: [{metricName:"oilTemp"},{metricName:"tubingPressure"}]){
//     metric,
//     measurements {
//       metric,
//       at,
//       value,
//       unit
//     }
//   }
// }

// subscription {
//   newMeasurement {
//     metric,
//     at,
//     value,
//     unit
//   }
// }

// query{
//   getLastKnownMeasurement(metricName:"oilTemp") {
//     metric,
//     at,
//     value,
//     unit
//   }
// }

// date = new Date(date.getTime() - 30 * 60000);

const thirtyMinutesAgo = new Date(Date.now() - 30 * 60000).getTime();

const addZero = (i: string | number) => {
  if (i < 10) {
    i = '0' + i;
  }
  return i;
};

const dateFormatter = (ms: string | number | Date) => {
  const d = new Date(ms);
  const h = addZero(d.getHours());
  const m = addZero(d.getMinutes());
  const s = addZero(d.getSeconds());
  return h + ':' + m + ':' + s;
};

const getMetricsQuery = `
  query{
    getMetrics
  }
`;

const getInputQuery = (metrics: string[]) => {
  return metrics.map(metric => {
    return `{ metricName: "${metric}", after: ${thirtyMinutesAgo} }`;
  });
};

const getDataQuery = (inputQuery: string[]) => {
  return `
 query {
   getMultipleMeasurements(input: [${inputQuery}]){
     metric,
     measurements {
       metric,
       at,
       value,
       unit
     }
   }
 }
`;
};

const subscription = `subscription {
  newMeasurement {
    metric,
    at,
    value,
    unit
  }
}`;

const fetchMetrics = async () => {
  const res = await client.query({
    query: gql`
      ${getMetricsQuery}
    `,
  });
  return res.data.getMetrics;
};

const fetchData = async (metrics: string[]) => {
  const res = await client.query({
    query: gql`
      ${getDataQuery(getInputQuery(metrics))}
    `,
  });
  return res.data.getMultipleMeasurements;
};

const connectSubscriptions = async () => {
  const res = await client.subscribe({
    query: gql`
      ${subscription}
    `,
  });
  console.log(res);
};

interface Measurement {
  metric: string;
  at: number;
  value: number;
  unit: string;
}

interface MetricNode {
  metric: string;
  measurements: Measurement[];
}

export interface TransformedMetricNode {
  metric: string;
  unit: string;
  stroke: string;
}

const metricFilter = (metrics: TransformedMetricNode[], selection: string[]) => {
  return metrics.filter(metricNode => {
    return selection.includes(metricNode.metric);
  });
};

const metricTransformer = (data: MetricNode[]) => {
  const colorArr = ['#a83a32', '#2d8fa1', '#5ba12d', '#9c2894', '#e6ad8e', '#32403f'];
  let returnArr: TransformedMetricNode[] = [];
  data.forEach((metricNode, index) => {
    returnArr.push({
      metric: metricNode.metric,
      unit: metricNode.measurements[0].unit,
      stroke: colorArr[index],
    });
  });
  return returnArr;
};

const dataTransformer = (data: MetricNode[]) => {
  const returnArr: any[] = [];
  data.forEach(metricNode => {
    metricNode.measurements.forEach(measurement => {
      returnArr.push({
        time: dateFormatter(measurement.at),
      });
    });
  });
  data.forEach(metricNode => {
    metricNode.measurements.forEach((measurement, index) => {
      returnArr[index][`${measurement.metric}`] = measurement.value;
    });
  });
  return returnArr;
};

export default () => {
  const classes = useStyles();
  const [metricStrings, setMetricStrings] = React.useState<string[]>([]);
  const [selection, setSelection] = React.useState<string[]>([]);
  const [metrics, setMetrics] = React.useState<TransformedMetricNode[]>([]);
  const [data, setData] = React.useState<any[]>([]);
  const [selectedMetrics, setSelectedMetrics] = React.useState<TransformedMetricNode[]>([]);

  React.useEffect(() => {
    const initialFetch = async () => {
      const metricsRes = await fetchMetrics();
      console.log(metricsRes);
      const dataRes = await fetchData(metricsRes);
      connectSubscriptions();
      console.log(dataRes);
      const transformedData = dataTransformer(dataRes);
      const transformedMetrics = metricTransformer(dataRes);
      console.log('got data');
      setMetricStrings(metricsRes);
      setMetrics(transformedMetrics);
      setData(transformedData);
    };
    initialFetch();
  }, []);

  React.useEffect(() => {
    console.log('before filter');
    const filteredMetrics = metricFilter(metrics, selection);
    console.log(filteredMetrics);
    console.log('after filter');
    setSelectedMetrics(filteredMetrics);
  }, [metrics, selection]);

  return (
    <Card className={classes.card}>
      <DashHeader metrics={metricStrings} selection={selection} setSelection={setSelection} />
      <CardContent>
        <Chart data={data} selectedMetrics={selectedMetrics} />
      </CardContent>
    </Card>
  );
};
