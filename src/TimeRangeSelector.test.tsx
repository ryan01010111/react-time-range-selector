import { render } from '@testing-library/react';
import TimeRangeSelector from './TimeRangeSelector';

test('should render time range selector', () => {
  const { getByText } = render(
    <TimeRangeSelector
      width={300}
      startVal={20}
      endVal={30}
      setStartVal={() => null}
      setEndVal={() => null}
      openCloseTimes={['08:00', '23:00']}
      unavailableVals={[[34, 40]]}
    />
  );

  const durationText = getByText(/[0-9]+ h/i);
  expect(durationText).toBeInTheDocument();

  const startHandle = document.getElementById('handle-start');
  expect(startHandle).toBeInTheDocument();

  const endHandle = document.getElementById('handle-end');
  expect(endHandle).toBeInTheDocument();
});
