import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Card, CardContent } from '@material-ui/core';
import DashHeader from './DashHeader';
import Chart from './Chart';
import { client } from '../App';
import { useSubscription } from '@apollo/react-hooks';
import { gql } from '@apollo/client';

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

const newMeasurementsSub = gql`
  subscription {
    newMeasurement {
      metric
      at
      value
      unit
    }
  }
`;

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

interface Measurement {
  metric: string;
  at: number;
  value: number;
  unit: string;
}

interface MeasurementSub {
  newMeasurement: Measurement;
}

interface MetricNode {
  metric: string;
  measurements: Measurement[];
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
  return returnArr;
};

export default () => {
  const classes = useStyles();
  const [metricStrings, setMetricStrings] = React.useState<string[]>([]);
  const [selection, setSelection] = React.useState<(string | undefined)[]>([]);
  const [initialData, setInitialData] = React.useState<Plotly.Data[]>([]);
  const [filteredData, setFilteredData] = React.useState<Plotly.Data[]>([]);
  const { loading, data } = useSubscription<MeasurementSub>(newMeasurementsSub);
  const [prevSubData, setPrevSubData] = React.useState<Measurement>({metric: "", at: 0, value: 0, unit: ""});

  React.useEffect(() => {
    const initialFetch = async () => {
      const metricsRes = await fetchMetrics();
      const dataRes = await fetchData(metricsRes);
      const transformedData = dataTransformer(dataRes);
      setMetricStrings(metricsRes);
      setInitialData(transformedData);
    };
    initialFetch();
  }, []);

  React.useEffect(() => {
    const filteredDataValue = dataFilter(initialData, selection);
    setFilteredData(filteredDataValue);
  }, [initialData, selection]);

  React.useEffect(()=>{
    if (!loading && (data?.newMeasurement.at !== prevSubData.at || data.newMeasurement.value !== prevSubData.value)) {
        console.log(data?.newMeasurement);
        let measurementNode = data?.newMeasurement
        let matchingSet = initialData.find((metricNode)=>metricNode.name === measurementNode?.metric);
        if (matchingSet && measurementNode){
          (matchingSet.x as Plotly.Datum[]).push(new Date(measurementNode.at));
          (matchingSet.y as Plotly.Datum[]).push(measurementNode.value);
          const updatedData = initialData.map((metricNode)=>{
            if(metricNode.name === measurementNode?.metric){
              return matchingSet
            } else {
              return metricNode
            }
          });
          setInitialData(updatedData as Plotly.Data[]);
          if (data) {setPrevSubData(data.newMeasurement)}
        }
      }
  },[initialData, loading, data, prevSubData])

  return (
    <Card className={classes.card}>
      <DashHeader metrics={metricStrings} selection={selection} setSelection={setSelection} />
      <CardContent style={{ padding: 0 }}>
        <Chart data={filteredData} />
      </CardContent>
    </Card>
  );
};
