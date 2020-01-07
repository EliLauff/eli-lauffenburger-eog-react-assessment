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
  x: string[];
  y: number[];
  name: string;
  yaxis: string;
  type: string;
}

const dataFilter = (data: Plotly.Data[], selection: (string | undefined)[]) => {
  let returnArr = data.filter(metricObj => {
    return selection.includes(metricObj.name);
  });

  //workaround for limitation with Plotly - it was unable to display pressure and injValveOpen
  //together without having temperature present. This dummy object tricks it into thinking the primary yaxis is present.
  const dummyObj: Plotly.Data = {
    x: [],
    y: [],
    name: '',
    yaxis: 'y',
    type: 'scatter',
    line: { color: '#444' },
  };

  returnArr.push(dummyObj);

  return returnArr;
};

// const metricTransformer = (data: MetricNode[]) => {
//   const colorArr = ['#a83a32', '#2d8fa1', '#5ba12d', '#9c2894', '#e6ad8e', '#32403f'];
//   let returnArr: TransformedMetricNode[] = [];
//   data.forEach((metricNode, index) => {
//     returnArr.push({
//       metric: metricNode.metric,
//       unit: metricNode.measurements[0].unit,
//       stroke: colorArr[index],
//     });
//   });
//   return returnArr;
// };

const dataTransformer = (data: MetricNode[]) => {
  const returnArr: Plotly.Data[] = [];
  const colorArr: string[] = ['#a83a32', '#2d8fa1', '#5ba12d', '#9c2894', '#e6ad8e', '#32403f'];
  data.forEach(metricNode => {
    let metricObj: Plotly.Data = {
      x: [],
      y: [],
      name: '',
      yaxis: '',
      type: 'scatter',
      line: { color: colorArr[data.indexOf(metricNode)] },
    };
    metricNode.measurements.forEach(measurement => {
      (metricObj.x as Plotly.Datum[]).push(new Date(measurement.at));
      (metricObj.y as Plotly.Datum[]).push(measurement.value);
    });
    metricObj.name = metricNode.metric;
    switch (metricNode.measurements[0].unit) {
      case 'F':
        metricObj.yaxis = 'y';
        break;
      case 'PSI':
        metricObj.yaxis = 'y2';
        break;
      case '%':
        metricObj.yaxis = 'y3';
    }
    returnArr.push(metricObj);
  });
  console.log(returnArr);
  return returnArr;
};

export default () => {
  const classes = useStyles();
  const [metricStrings, setMetricStrings] = React.useState<string[]>([]);
  const [selection, setSelection] = React.useState<(string | undefined)[]>([]);
  //   const [metrics, setMetrics] = React.useState<TransformedMetricNode[]>([]);
  const [data, setData] = React.useState<Plotly.Data[]>([]);
  const [filteredData, setFilteredData] = React.useState<Plotly.Data[]>([]);

  React.useEffect(() => {
    const initialFetch = async () => {
      const metricsRes = await fetchMetrics();
      console.log(metricsRes);
      const dataRes = await fetchData(metricsRes);
      //   connectSubscriptions();
      console.log(dataRes);
      const transformedData = dataTransformer(dataRes);
      //   const transformedMetrics = metricTransformer(dataRes);
      console.log('got data');
      setMetricStrings(metricsRes);
      //   setMetrics(transformedMetrics);
      setData(transformedData);
    };
    initialFetch();
  }, []);

  React.useEffect(() => {
    console.log('before filter');
    const filteredDataValue = dataFilter(data, selection);
    console.log(filteredDataValue);
    console.log('after filter');
    setFilteredData(filteredDataValue);
  }, [data, selection]);

  return (
    <Card className={classes.card}>
      <DashHeader metrics={metricStrings} selection={selection} setSelection={setSelection} />
      <CardContent style={{ padding: 0 }}>
        <Chart data={filteredData} />
      </CardContent>
    </Card>
  );
};
