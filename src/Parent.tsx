import { CSSProperties, useState } from 'react';
import TimeRangeSelector from './TimeRangeSelector';

function valToTimeStr(val: number) {
    return String(val / 2).replace(/([0-9]+)(\..+)?/, (_match, hour, min) => {
        return `${hour}${min ? ':30' : ':00'}`;
    });
}

// static data
const staticOpenCloseTimes: [string, string] = ['08:00', '23:00'];
const staticUnavailableVals: [number, number][] = [[34, 40]];

function Parent() {
  const [startVal, setStartVal] = useState(20);
  const [endVal, setEndVal] = useState(30);

  const containerStyles: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  }

  return (
    <div id="trs-container" style={containerStyles}>
      <div id="trs-selection">
        {valToTimeStr(startVal)}&emsp;&ndash;&emsp;{valToTimeStr(endVal)}
      </div>
      <TimeRangeSelector
        width={300}
        startVal={startVal}
        endVal={endVal}
        setStartVal={setStartVal}
        setEndVal={setEndVal}
        openCloseTimes={staticOpenCloseTimes}
        unavailableVals={staticUnavailableVals}
      />
    </div>
  );
}

export default Parent;
