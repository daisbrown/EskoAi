import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register the necessary components for Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const BarChart = ({ chartData }) => {
  // chartData should be the object like { type: 'bar', data: {...}, options: {...} }
  if (!chartData || !chartData.data || !chartData.options) {
    console.error("Invalid chartData passed to BarChart", chartData);
    return <div>Invalid chart data received.</div>; // Or return null
  }

  // Ensure options are passed correctly, providing defaults if necessary
  const options = {
      responsive: true, // Make chart responsive
      maintainAspectRatio: false, // Allow custom height/width ratio
      ...chartData.options, // Spread the options from AI
      plugins: {
          legend: {
              position: 'top', // Default legend position
              ...(chartData.options?.plugins?.legend || {}), // Merge AI legend options
          },
          title: {
              display: true,
              text: chartData.data?.datasets?.[0]?.label || 'Chart', // Use dataset label as title or default
              ...(chartData.options?.plugins?.title || {}), // Merge AI title options
          },
          // Merge other potential plugin options robustly
         ...(chartData.options?.plugins || {}), // Merge other potential plugin options robustly, but ensure title/legend take precedence if defined above
      },
      scales: { // Ensure scales structure exists if needed by AI options
          ...(chartData.options?.scales || {}), // Merge AI scales options
      }
  };


  return (
      // Ensure the container has relative positioning and defined height for the chart
      <div style={{ position: 'relative', height: '350px', width: '95%', margin: '15px auto' }}>
          <Bar options={options} data={chartData.data} />
      </div>
  );
};

export default BarChart;
