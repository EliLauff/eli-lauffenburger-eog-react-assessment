import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { CardContent, Grid } from '@material-ui/core';
import SelectBox from './SelectBox';

const useStyles = makeStyles({
  taskBar: {
    backgroundColor: 'silver',
  },
});

export default (props: { metrics: string[]; selection: (string | undefined)[]; setSelection: Function }) => {
  console.log(props.metrics);
  const classes = useStyles();
  return (
    <CardContent className={classes.taskBar}>
      <Grid container spacing={4} justify="space-between">
        <Grid item xs={12} sm={6}></Grid>
        <Grid item xs={12} sm={6}>
          <SelectBox metrics={props.metrics} selection={props.selection} setSelection={props.setSelection} />
        </Grid>
      </Grid>
    </CardContent>
  );
};
