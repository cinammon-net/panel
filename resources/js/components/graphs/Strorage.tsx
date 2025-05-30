import axios from 'axios';
import { ArcElement, Chart as ChartJS, Legend, Title, Tooltip } from 'chart.js';
import React, { useEffect } from 'react';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Title, Tooltip, Legend);

interface StorageProps {
    setStorageData: (data: number[]) => void;
}

const Storage: React.FC<StorageProps> = ({ setStorageData }) => {
    const [storageData, setStorageDataState] = React.useState<number[]>([]);

    useEffect(() => {
        const fetchStorageData = async () => {
            try {
                const response = await axios.get('/storage-data');
                setStorageDataState(response.data);
                setStorageData(response.data);
            } catch (error) {
                console.error('Error fetching storage data:', error);
            }
        };

        fetchStorageData();
    }, [setStorageData]);

    const data = {
        labels: ['Used', 'Free'],
        datasets: [
            {
                data: storageData,
                backgroundColor: ['rgba(54, 162, 235, 0.6)', 'rgba(153, 102, 255, 0.6)'],
                hoverBackgroundColor: ['rgba(54, 162, 235, 0.8)', 'rgba(153, 102, 255, 0.8)'],
            },
        ],
    };

    return (
        <div className="mb-2 w-full rounded border border-cyan-700 p-2">
            <legend className="px-2 text-sm font-semibold text-cyan-600 dark:text-cyan-400">Storage Usage</legend>
            <div className="flex h-86 items-center justify-center">
                <Pie
                    data={data}
                    options={{
                        responsive: true,
                        plugins: {
                            legend: {
                                display: true, 
                                position: 'bottom',
                                
                            },
                            tooltip: {
                                enabled: true,
                            },
                        },
                    }}
                    height={400}
                    width={400}
                />
            </div>
        </div>
    );
};

export default Storage;
