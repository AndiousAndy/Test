'use client';

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate: Date;
  onComplete?: () => void; // Optional callback when timer finishes
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetDate, onComplete }) => {
  const calculateTimeLeft = () => {
    const difference = +targetDate - +new Date();
    let timeLeft = {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }

    return { timeLeft, difference };
  };

  const [timeState, setTimeState] = useState(calculateTimeLeft());
  const { timeLeft, difference } = timeState;

  useEffect(() => {
    // Recalculate immediately in case targetDate prop changes
    setTimeState(calculateTimeLeft());

    // Only set interval if time is left
    if (difference <= 0) {
        if (onComplete) {
            onComplete(); // Call completion callback if already passed
        }
        return;
    }

    const timer = setInterval(() => {
      const newTimeState = calculateTimeLeft();
      setTimeState(newTimeState);

      if (newTimeState.difference <= 0) {
        clearInterval(timer);
        if (onComplete) {
          onComplete(); // Call completion callback
        }
      }
    }, 1000);

    // Cleanup interval on component unmount or targetDate change
    return () => clearInterval(timer);
  }, [targetDate, onComplete]); // Rerun effect if targetDate or onComplete changes

  // Format the output
  const formatTime = (value: number) => value.toString().padStart(2, '0');

  // Decide what to display
  if (difference <= 0) {
    return <span className="text-green-400 font-semibold">Live</span>; // Or "Starting..."
  }

  let displayString = '';
  if (timeLeft.days > 0) {
    displayString += `${timeLeft.days}d `;
  }
  if (timeLeft.hours > 0 || timeLeft.days > 0) { // Show hours if days > 0 or hours > 0
     displayString += `${formatTime(timeLeft.hours)}h `;
  }
   // Always show minutes and seconds if time remaining
   displayString += `${formatTime(timeLeft.minutes)}m ${formatTime(timeLeft.seconds)}s`;


  return <span className="font-mono font-semibold">{displayString.trim()}</span>;
};

export default CountdownTimer;
