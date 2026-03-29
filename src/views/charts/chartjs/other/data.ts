import {getColor, getFont} from "@/helpers/chart";
import type {ChartJSOptionsType} from "@/types";

export const getBubbleChart: () => ChartJSOptionsType = () => ({
    data: {
        labels: ['Jan', 'Feb', 'March', 'April', 'May', 'June'],
        datasets: [
            {
                label: 'Data One',
                data: [
                    {x: 10, y: 20, r: 5},
                    {x: 20, y: 10, r: 5},
                    {x: 15, y: 15, r: 5},
                    {x: 25, y: 12, r: 6},
                    {x: 18, y: 25, r: 7},
                    {x: 30, y: 8, r: 4},
                    {x: 22, y: 18, r: 6},
                    {x: 35, y: 20, r: 5},
                    {x: 28, y: 30, r: 7},
                    {x: 12, y: 26, r: 6},
                    {x: 40, y: 10, r: 5},
                ],
                borderColor: getColor('chart-primary'),
                backgroundColor: getColor('chart-primary-rgb', 0.2),
                borderWidth: 2,
                borderSkipped: false,
            },
            {
                label: 'Data Two',
                data: [
                    {x: 12, y: 22},
                    {x: 22, y: 20},
                    {x: 5, y: 15},
                    {x: 16, y: 18},
                    {x: 9, y: 24},
                    {x: 28, y: 14},
                    {x: 19, y: 17},
                    {x: 33, y: 21},
                    {x: 14, y: 28},
                    {x: 8, y: 19},
                    {x: 36, y: 16},
                ],
                borderColor: getColor('chart-gray'),
                backgroundColor: getColor('chart-gray-rgb', 0.2),
                borderWidth: 2,
                borderSkipped: false,
            },
        ],
    },
})

const generateRandomData2 = (length: number, min = -20, max = 80) => {
    return Array.from({length}, () => Math.floor(Math.random() * (max - min + 1)) + min)
}

export const getComboBarLineChart: () => ChartJSOptionsType = () => ({
    data: {
        labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August'],
        datasets: [
            {
                type: 'line',
                label: 'Line Dataset',
                data: generateRandomData2(8, 20, 90),
                borderColor: getColor('chart-primary'),
                backgroundColor: getColor('chart-primary-rgb', 0.2),
                tension: 0.4,
                fill: false,
                yAxisID: 'y',
            },
            {
                type: 'bar',
                label: 'Bar Dataset',
                data: generateRandomData2(8, -20, 80),
                borderColor: getColor('chart-gray'),
                backgroundColor: getColor('chart-gray'),
                yAxisID: 'y',
                barThickness: 12,
            },
        ],
    },
})

export const getStackedBarLineChart: () => ChartJSOptionsType = () => ({
    data: {
        labels: ['January', 'February', 'March', 'April', 'May', 'June'],
        datasets: [
            {
                type: 'bar',
                label: 'Bar Dataset 1',
                data: [30, 20, 50, 40, 60, 70],
                borderColor: getColor('chart-dark'),
                backgroundColor: getColor('chart-dark'),
                stack: 'Stack 0',
                barThickness: 20,
            },
            {
                type: 'bar',
                label: 'Bar Dataset 2',
                data: [20, 15, 30, 25, 35, 40],
                borderColor: getColor('chart-primary'),
                backgroundColor: getColor('chart-primary'),
                stack: 'Stack 0',
                barThickness: 20,
            },
            {
                type: 'line',
                label: 'Line Dataset',
                data: [60, 55, 90, 75, 95, 110],
                borderColor: getColor('chart-gray'),
                backgroundColor: getColor('chart-gray-rgb', 0.2),
                tension: 0.4,
                fill: false,
                yAxisID: 'y',
            },
        ],
    },
})

export const getDoughnutChart: () => ChartJSOptionsType = () => ({
    data: {
        labels: ['Organic Search', 'Social Media', 'Referral', 'Email Campaign'],
        datasets: [
            {
                data: [420, 210, 150, 90],
                backgroundColor: [getColor('chart-primary'), getColor('chart-secondary'), getColor('chart-dark'), getColor('chart-gray')],
                borderColor: 'transparent',
                borderWidth: 3,
            },
        ],
    },
    options: {
        cutout: '65%',
        plugins: {
            legend: {display: false},
            tooltip: {
                enabled: true,
                callbacks: {
                    label: function (ctx) {
                        return `${ctx.label}: ${ctx.parsed}`
                    },
                },
            },
        },
        scales: {
            x: {display: false, grid: {display: false}, ticks: {display: false}},
            y: {display: false, grid: {display: false}, ticks: {display: false}},
        },
    },
})

export const getPieChart: () => ChartJSOptionsType = () => ({
    data: {
        labels: ['Organic Search', 'Social Media', 'Referral', 'Email Campaign'],
        datasets: [
            {
                data: [420, 210, 150, 90],
                backgroundColor: [getColor('chart-dark'), getColor('chart-primary'), getColor('chart-secondary'), getColor('chart-gray')],
                borderColor: 'transparent',
                borderWidth: 3,
            },
        ],
    },
    options: {
        plugins: {
            legend: {display: false},
            tooltip: {
                enabled: true,
                callbacks: {
                    label: function (ctx) {
                        return `${ctx.label}: ${ctx.parsed}`
                    },
                },
            },
        },
        scales: {
            x: {display: false, grid: {display: false}, ticks: {display: false}},
            y: {display: false, grid: {display: false}, ticks: {display: false}},
        },
    },
})

export const getMultiPieChart: () => ChartJSOptionsType = () => ({
    data: {
        labels: ['Organic Search', 'Social Media', 'Referral', 'Email Campaign'],
        datasets: [
            {
                label: '2024',
                data: [300, 150, 100, 80],
                backgroundColor: [getColor('chart-primary'), getColor('chart-secondary'), getColor('chart-dark'), getColor('chart-gray')],
                borderColor: 'transparent',
                borderWidth: 3,
            },
            {
                label: '2023',
                data: [250, 120, 90, 60],
                backgroundColor: [
                    getColor('chart-primary-rgb', 0.3),
                    getColor('chart-secondary-rgb', 0.3),
                    getColor('chart-dark-rgb', 0.3),
                    getColor('chart-gray-rgb', 0.3),
                ],
                borderColor: 'transparent',
                borderWidth: 3,
            },
        ],
    },
    options: {
        cutout: '30%',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    font: {family: getFont()},
                    color: getColor('secondary-color'),
                    usePointStyle: true,
                    pointStyle: 'circle',
                    boxWidth: 8,
                    boxHeight: 8,
                    padding: 15,
                },
            },
            tooltip: {
                callbacks: {
                    label: function (ctx) {
                        return `${ctx.dataset.label} - ${ctx.label}: ${ctx.parsed}`
                    },
                },
            },
        },
        scales: {
            x: {display: false},
            y: {display: false},
        },
    },
})

export const getPolarAreaChart: () => ChartJSOptionsType = () => ({
    data: {
        labels: ['Jan', 'Feb', 'March', 'April', 'May'],
        datasets: [
            {
                label: 'Dataset 1',
                data: [12, 19, 14, 15, 20],
                backgroundColor: [
                    getColor('chart-primary'),
                    getColor('chart-secondary'),
                    getColor('chart-dark'),
                    getColor('chart-gray'),
                    getColor('chart-primary-rgb', 0.5),
                ],
                borderColor: [
                    getColor('chart-primary'),
                    getColor('chart-secondary'),
                    getColor('chart-dark'),
                    getColor('chart-gray'),
                    getColor('chart-primary-rgb', 0.1),
                ],
                borderWidth: 2,
            },
        ],
    },
    options: {
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    font: {family: getFont()},
                    color: getColor('secondary-color'),
                    usePointStyle: true,
                    pointStyle: 'circle',
                    boxWidth: 8,
                    boxHeight: 8,
                    padding: 15,
                },
            },
            tooltip: {
                callbacks: {
                    label: function (ctx) {
                        return `${ctx.dataset.label} - ${ctx.label}: ${ctx.parsed}`
                    },
                },
            },
        },
        scales: {
            x: {display: false},
            y: {display: false},
            r: {
                angleLines: {
                    color: getColor('border-color'),
                },
                grid: {
                    color: getColor('border-color'),
                },
                pointLabels: {
                    color: getColor('secondary-color'),
                },
                ticks: {
                    font: {family: getFont()},
                    color: getColor('secondary-color'),
                    backdropColor: 'transparent',
                },
            },
        },
    },
})

export const getScatterChart: () => ChartJSOptionsType = () => ({
    data: {
        labels: ['Jan', 'Feb', 'March', 'April', 'May', 'June', 'July'],
        datasets: [
            {
                label: 'Dataset 1',
                data: [
                    {x: 10, y: 50},
                    {x: 50, y: 10},
                    {x: 15, y: 15},
                    {x: 20, y: 45},
                    {x: 25, y: 18},
                    {x: 34, y: 38},
                    {x: 42, y: 30},
                    {x: 28, y: 20},
                    {x: 55, y: 15},
                ],
                borderColor: getColor('chart-dark'),
                backgroundColor: getColor('chart-dark-rgb', 0.2),
                pointRadius: 8,
                pointHoverRadius: 10,
            },
            {
                label: 'Dataset 2',
                data: [
                    {x: 15, y: 45},
                    {x: 40, y: 20},
                    {x: 30, y: 5},
                    {x: 35, y: 25},
                    {x: 18, y: 25},
                    {x: 40, y: 8},
                    {x: 22, y: 32},
                    {x: 48, y: 16},
                    {x: 38, y: 22},
                ],
                borderColor: getColor('chart-gray'),
                backgroundColor: getColor('chart-gray-rgb', 0.2),
                pointRadius: 8,
                pointHoverRadius: 10,
            },
        ],
    },
})

export const getRadarChart: () => ChartJSOptionsType = () => ({
    type: 'radar', data: {
        labels: ['Jan', 'Feb', 'March', 'April', "May", "June"], datasets: [{
            label: 'Dataset 1',
            data: [12, 29, 39, 22, 28, 34],
            borderColor: getColor('chart-primary'),
            backgroundColor: getColor('chart-primary-rgb', 0.2),

        }, {
            label: 'Dataset 2',
            data: [10, 19, 15, 28, 34, 39],
            borderColor: getColor('chart-dark'),
            backgroundColor: getColor('chart-dark-rgb', 0.2),

        },]
    },
    options: {
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    font: {family: getFont()},
                    color: getColor('secondary-color'),
                    usePointStyle: true,
                    pointStyle: 'circle',
                    boxWidth: 8,
                    boxHeight: 8,
                    padding: 15
                }
            },
            tooltip: {
                callbacks: {
                    label: function (ctx) {
                        return `${ctx.dataset.label} - ${ctx.label}: ${ctx.parsed}`;
                    }
                }
            }
        },
        scales: {
            x: {display: false},
            y: {display: false},
            r: {
                angleLines: {
                    color: getColor('border-color')
                },
                grid: {
                    color: getColor('border-color')
                },
                pointLabels: {
                    color: getColor('secondary-color'),
                    font: {
                        family: getFont(),
                        size: 14
                    },
                },
                ticks: {
                    font: {family: getFont()},
                    color: getColor('secondary-color'),
                    backdropColor: 'transparent'
                }
            }
        }
    }
})
