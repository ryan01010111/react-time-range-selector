import React, { FC, Fragment, useRef } from 'react';

const tau = 2 * Math.PI;
const cx = 200;
const cy = 200;
const radius = 176;
const minVal = 0;
const maxVal = 48;
const outerRingWidth = 46;
const innerRingWidth = 30;

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = angleInDegrees * Math.PI / 180;
  const x = centerX + (radius * Math.cos(angleInRadians));
  const y = centerY + (radius * Math.sin(angleInRadians));
  return { x, y };
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  const endAngleInitial = endAngle;

  if (endAngleInitial - startAngle === 360) {
    endAngle = 359;
  }

  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const arcSweep = endAngle > startAngle
    ? endAngle - startAngle <= 180 ? '0' : '1'
    : Math.abs(endAngle - startAngle) <= 180 ? '1' : '0'

  const path = [
    'M', start.x, start.y,
    'A', radius, radius, 0, arcSweep, 0, end.x, end.y
  ];

  if (endAngleInitial - startAngle === 360) {
    path.push('z');
  }

  return path.join(' ');
}

function calculateHandleCenter(angle: number, radius: number) {
  const x = cx + Math.cos(angle) * radius;
  const y = cy + Math.sin(angle) * radius;
  return { x, y };
}

function calculateMouseAngle(rmc: { x: number, y: number }) {
  const angle = Math.atan2(rmc.y - cy, rmc.x - cx);

  if (angle > - tau / 2 && angle < - tau / 4) {
    return angle + tau * 1.25;
  }
  else {
    return angle + tau * 0.25;
  }
}

function timeStrToVal(time: string) {
  return +(time.replace(/(..):(..)/, (_match, hour, min) => {
    return `${hour}${+min ? '.5' : ''}`;
  })) * 2;
}

type MouseOrTouchEvent = React.MouseEvent | React.TouchEvent;

function isTouchEvent(e: MouseOrTouchEvent): e is React.TouchEvent {
  return e.nativeEvent instanceof TouchEvent;
}

export type OpenCloseTimes = [open: string, end: string];

export type UnavailableVals = [start: number, end: number][];

interface Props {
  width: number,
  startVal: number,
  endVal: number,
  setStartVal: (val: number) => void,
  setEndVal: (val: number) => void,
  openCloseTimes: OpenCloseTimes,
  unavailableVals: UnavailableVals
}

const TimeRangeSelector: FC<Props> = ({
  width,
  startVal,
  endVal,
  openCloseTimes,
  setStartVal,
  setEndVal,
  unavailableVals
}) => {
  const openCloseVals = openCloseTimes.map(time => timeStrToVal(time));
  const startActive = useRef(false);
  const endActive = useRef(false);
  const svg = useRef<SVGSVGElement>(null);

  function genUnavailableSlots() {
    let prevEnd = -1;
    return [[openCloseVals[1], openCloseVals[0]], ...unavailableVals].map(([start, end]) => {
      if (start === end) return null;
      // if unavailable slots back-to-back, allow excess length of arcs to overlap
      // else, add 1 to start value, or subtract 1 from end value to compensate for rounded stroke ends
      if (start !== prevEnd) start++;
      prevEnd = end;
      if (end !== openCloseVals[1]) end--;

      const startAngle = Math.floor((start / (maxVal - minVal)) * 360);
      const endAngle = Math.floor((end / (maxVal - minVal)) * 360);
      return (
        <path key={`${start}-${end}`}
          d={describeArc(cx, cy, radius, startAngle, endAngle)}
          stroke="#abb0ba"
          strokeWidth={innerRingWidth}
          strokeLinecap="round"
          fill="none"
        />
      );
    });
  }

  function genSelection() {
    const startAngle = Math.floor((startVal / (maxVal - minVal)) * 360);
    const endAngle = Math.floor((endVal / (maxVal - minVal)) * 360);

    const selectedDef = describeArc(cx, cy, radius, startAngle, endAngle);
    const startHandleCoords = calculateHandleCenter(startAngle * tau / 360, radius);
    const endHandleCoords = calculateHandleCenter(endAngle * tau / 360, radius);

    return (<>
      <path d={selectedDef}
        strokeDasharray="8 2"
        stroke="#8cde12"
        strokeWidth={innerRingWidth}
        fill="none"
      />
      <circle
        id="handle-start"
        cx={startHandleCoords.x}
        cy={startHandleCoords.y}
        r={innerRingWidth / 2}
        strokeWidth="20"
        stroke="transparent"
        fill="#8cde12"
        onMouseDown={onStartDown}
        onTouchStart={onStartDown}
      >
      </circle>
      <circle
        cx={startHandleCoords.x}
        cy={startHandleCoords.y}
        r={(innerRingWidth / 2) - 6}
        stroke="#fff"
        strokeWidth="1"
        fill="none"
        pointerEvents="none"
      />
      <circle
        id="handle-end"
        cx={endHandleCoords.x}
        cy={endHandleCoords.y}
        r={innerRingWidth / 2}
        strokeWidth="20"
        stroke="transparent"
        fill="#8cde12"
        onMouseDown={onEndDown}
        onTouchStart={onEndDown}
      />
      <circle
        cx={endHandleCoords.x}
        cy={endHandleCoords.y}
        r={(innerRingWidth / 2) - 6}
        stroke="#fff"
        strokeWidth="1"
        fill="none"
        pointerEvents="none"
      />
    </>)
  }

  function getDurationStr() {
    const diff = endVal >= startVal
      ? (endVal - startVal)
      : maxVal - startVal + endVal;
    const durationHrs = diff * 30 / 60;
    return String(durationHrs)
      .replace(/([0-9]+)(\.[0-9]+)?/, (_match, hour, min) => {
        return `${hour} h${min ? ' 30 min' : ''}`
      });
  }

  function calcCurrentAngle(e: MouseOrTouchEvent) {
    if (!svg.current) return;
    if (!(e.nativeEvent instanceof TouchEvent)) e.preventDefault();
    const svgBCR = svg.current.getBoundingClientRect();
    const scaleConstant = (400 - width) / width;

    // when selector is positioned relative to viewport: use clientX/clientY
    // when selector is positioned within normal flow of document: use pageX/pageY
    const rmc = isTouchEvent(e)
      ? {
        x: e.touches[0].clientX - svgBCR.left + ((e.touches[0].clientX - svgBCR.left) * scaleConstant),
        y: e.touches[0].clientY - svgBCR.top + ((e.touches[0].clientY - svgBCR.top) * scaleConstant),
      }
      : {
        x: e.clientX - svgBCR.left + ((e.clientX - svgBCR.left) * scaleConstant),
        y: e.clientY - svgBCR.top + ((e.clientY - svgBCR.top) * scaleConstant),
      };
    return calculateMouseAngle(rmc) * 0.999;
  }

  function updateSelection(e: MouseOrTouchEvent) {
    const currentAngle = calcCurrentAngle(e);
    if (!currentAngle) return;

    const range = maxVal - minVal;
    const rawValue = currentAngle / tau * range;
    const steps = Math.round(rawValue / 1);
    const newValue = minVal + steps;

    let reqStart = startVal;
    let reqEnd = endVal;
    let setter: typeof setStartVal | typeof setEndVal;
    if (startActive.current) {
      reqStart = newValue;
      setter = setStartVal;
    } else {
      reqEnd = newValue;
      setter = setEndVal;
    }

    // requires further work for support of available slots crossing midnight 
    if (reqStart >= reqEnd || reqStart < openCloseVals[0] || reqEnd > openCloseVals[1]) {
      return;
    }

    const isAvailable = unavailableVals.every(([existStart, existEnd]) => {
      if (reqStart < existStart) {
        if (reqEnd > existStart) {
          if (reqEnd > existEnd && reqStart < existEnd) {
            if (startActive.current) {
              setStartVal(existStart - 1);
              setEndVal(existStart);
            } else {
              setStartVal(existEnd);
              setEndVal(reqEnd);
            }
          }
          return false;
        } else {
          return true;
        }
      } else {
        if (reqStart < existEnd) {
          return false;
        }
        return true;
      }
    });
    if (isAvailable) setter(newValue);
  }

  const onStartDown = (e: MouseOrTouchEvent) => {
    if (startActive.current) return;
    startActive.current = true;
    updateSelection(e);
  }

  const onEndDown = (e: MouseOrTouchEvent) => {
    if (endActive.current) return;
    endActive.current = true;
    updateSelection(e);
  }

  const onMouseOrTouchMove = (e: MouseOrTouchEvent) => {
    if (!startActive.current && !endActive.current) return;
    updateSelection(e);
  }

  const onMouseOrTouchUp = () => {
    startActive.current = false;
    endActive.current = false;
  }

  return (
    <svg ref={svg} id="time-range-selector" version="1.1" baseProfile="full" xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 400"
      width={width}
      height={width}
      onMouseUp={onMouseOrTouchUp}
      onTouchEnd={onMouseOrTouchUp}
      onMouseMove={onMouseOrTouchMove}
      onTouchMove={onMouseOrTouchMove}
    >

      <g transform={`rotate(-90, ${cx}, ${cy})`}>
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          strokeWidth={outerRingWidth}
          stroke="#e1e8f5"
          fill="none"
        />
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          strokeWidth={innerRingWidth}
          stroke="#5d8ff5"
          fill="none"
        />
        {genUnavailableSlots()}
        {startVal >= 0 && genSelection()}
      </g>
      {[...new Array(maxVal)].map((_, index) => (<Fragment key={index}>
        <path
          d={`M ${cx} ${cy + radius - innerRingWidth - 4} v 8`}
          strokeWidth={index % 2 ? 1 : 2}
          stroke="#888"
          transform={`rotate(${index * 7.5}, ${cx}, ${cy})`}
        />
        {!(index % 4) && (
          <text
            x={cx + (radius - 48) * Math.sin((-index * 7.5 + 180) * (Math.PI / 180))}
            y={cy + (radius - 48) * Math.cos((-index * 7.5 + 180) * (Math.PI / 180))}
            fontSize="16"
            fontFamily="Segoe UI, Roboto, sans-serif"
            fill="#888"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {index / 2}
          </text>)}
      </Fragment>))}
      <text
        x={cx}
        y={cy}
        fontFamily="Segoe UI, Roboto, sans-serif"
        fontSize="24"
        fontWeight="600"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {getDurationStr()}
      </text>

    </svg >
  );
}

export default TimeRangeSelector;
