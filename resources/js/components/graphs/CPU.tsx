import axios from 'axios';
import { ArcElement, CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, Title, Tooltip } from 'chart.js';
import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, ArcElement, Title, Tooltip, Legend, Filler);

const CPU: React.FC = () => {
    const [cpuData, setCpuDataState] = useState<number[]>([]);
    const [timeLabels, setTimeLabels] = useState<string[]>([]);

    useEffect(() => {
        const fetchCpuData = async () => {
            try {
                const response = await axios.get('http://127.0.0.1:8000/api/cpu-data'); // Cambia la URL si es necesario
                setCpuDataState(response.data.cpu_usage);
                setTimeLabels(response.data.time_labels || []); // Asegúrate de que `time_labels` esté presente en los datos
            } catch (error) {
                console.error('Error fetching CPU data:', error);
            }
        };

        fetchCpuData();
    }, []);

    const data = {
        labels: timeLabels,
        datasets: [
            {
                label: 'CPU Usage (%)',
                data: cpuData,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgb(75, 192, 192)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
            },
        ],
    };

    return (
        <div className="mb-2 w-full rounded border border-cyan-700 p-2">
            <legend className="mb-4 px-2 text-sm font-semibold text-cyan-600 dark:text-cyan-400">CPU Usage</legend>
            <div className="flex w-full items-center justify-center">
                <Line
                    data={data}
                    options={{
                        responsive: true,
                        plugins: {
                            legend: {
                                display: false, // Desactiva la leyenda
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

export default CPU;
