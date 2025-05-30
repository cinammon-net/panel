import axios from 'axios';
import { ArcElement, CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, Title, Tooltip } from 'chart.js';
import React, { useEffect } from 'react';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, ArcElement, Title, Tooltip, Legend, Filler);

interface MemoryProps {
    setMemoryData: (data: number[]) => void;
}

const Memory: React.FC<MemoryProps> = ({ setMemoryData }) => {
    const [memoryData, setMemoryDataState] = React.useState<number[]>([]);
    const [timeLabels, setTimeLabels] = React.useState<string[]>([]);

    useEffect(() => {
        const fetchMemoryData = async () => {
            try {
                const response = await axios.get('/memory-data');
                setMemoryDataState(response.data.memory_usage);
                setMemoryData(response.data.memory_usage);
                setTimeLabels(response.data.time_labels);
            } catch (error) {
                console.error('Error fetching memory data:', error);
            }
        };

        fetchMemoryData();
    }, [setMemoryData]);

    const data = {
        labels: timeLabels,
        datasets: [
            {
                label: 'Memory Usage (%)',
                data: memoryData,
                backgroundColor: 'rgba(128, 0, 107, 0.2)',
                borderColor: 'rgb(128, 0, 85)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
            },
        ],
    };

    return (
        <div className="mb-2 w-full rounded border border-cyan-700 p-2">
            <legend className="mb-4 px-2 text-sm font-semibold text-cyan-600 dark:text-cyan-400">Memory Usage</legend>
            <div className="flex w-full items-center justify-center">
                <Line
                    data={data}
                    options={{
                        responsive: true,
                        plugins: {
                            legend: {
                                display: false, // Eliminar la leyenda
                            },
                            tooltip: {
                                enabled: true,
                            },
                        },
                        scales: {
                            x: {
                                display: true,
                                title: { display: false },
                                ticks: { padding: 10, autoSkip: true, maxRotation: 0 },
                                grid: { display: false },
                            },
                            y: {
                                display: true,
                                title: { display: false },
                                beginAtZero: true,
                                ticks: { padding: 10, callback: (value) => `${Number(value) * 100}%` },
                                grid: { display: true, color: 'rgba(255, 255, 255, 0.2)', lineWidth: 1 },
                            },
                        },
                        layout: { padding: { left: 20, right: 20, top: 10, bottom: 10 } },
                    }}
                    height={600}
                    width={1000}
                />
            </div>
        </div>
    );
};

export default Memory;
