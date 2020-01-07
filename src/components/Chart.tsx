import React from 'react';
import Plot from 'react-plotly.js';
import { TransformedMetricNode } from './Dashboard';
import { Container } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles({
  plotArea: {
    width: '100%',
    height: '100%',
  },
});

export default (props: { data: Plotly.Data[] }) => {
  const classes = useStyles();
  const { data } = props;

  //workaround for limitation with Plotly - it was unable to display pressure and injValveOpen
  //together without having temperature present.  This checks for if the user has passed actual temperature data to the
  //chart, rather than just the dummy object.
  const tempPresent = data.filter(node => node.yaxis === 'y').length > 1;

  if (data.length > 1) {
    console.log(data);
    console.log(tempPresent);
    return (
      <Plot
        className={classes.plotArea}
        data={data}
        useResizeHandler={true}
        layout={{
          margin: { t: 85, b: 80 },
          autosize: true,
          xaxis: { domain: [0.1, 1] },
          yaxis: {
            title: 'temperature (F)',
            showline: true,
            zeroline: false,
            ticks: 'outside',
            visible: tempPresent,
          },
          yaxis2: {
            title: 'pressure (PSI)',
            overlaying: 'y',
            anchor: 'free',
            position: -0.1,
            side: 'left',
            showline: true,
            zeroline: false,
            tickmode: 'auto',
            ticks: 'inside',
            ticklen: 20,
            tickcolor: '#b8b8b8',
          },
          yaxis3: {
            title: 'injection valve opening (%)',
            overlaying: 'y',
            side: 'right',
            showline: true,
            zeroline: false,
            ticks: 'outside',
          },
          legend: { orientation: 'h', y: 1.2 },
        }}
        config={{
          displayModeBar: false,
        }}
      />
    );
  } else {
    return null;
  }
};
