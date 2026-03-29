import type {ChartJSOptionsType} from "@/types";
import {getColor} from '@/helpers/color'

export const getBasicAreaChart: () => ChartJSOptionsType = () => ({
  data: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
    datasets: [{
      label: 'User Signups',
      data: [120, 150, 180, 210, 190, 230, 250, 270, 300],
      backgroundColor: getColor('chart-primary-rgb', 0.3),
      borderColor: getColor('chart-primary'),
      fill: true,
      tension: 0.3,
      pointRadius: 0,
      borderWidth: 2
    }]
  },
    options: {
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                enabled: true,
                mode: 'index',
                intersect: false,
            },
        },
    },
})

export const getDifferentDatasetChart: () => ChartJSOptionsType = () => ({
    data: {
        labels: ['0', '1', '2', '3', '4', '5', '6', '7'],
        datasets: [
            {
                label: 'Current Month',
                data: [50, 42, 38, 35, 40, 50, 48, 47],
                fill: true,
                borderColor: getColor('chart-secondary'),
                backgroundColor: getColor('chart-secondary-rgb', 0.2),
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 1,
            },
            {
                label: 'Past Month',
                data: [60, 55, 50, 45, 50, 58, 55, 53],
                fill: true,
                borderColor: getColor('chart-gray'),
                backgroundColor: getColor('chart-gray-rgb', 0.2),
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 1,
            },
        ],
    },
    options: {
        interaction: {
            mode: 'index',
            intersect: false,
        },
    },
})

const randomSmoothData = (length: number, min = 30, max = 90) => {
    return Array.from({ length }, () => Math.floor(Math.random() * (max - min + 1)) + min)
}

export const getStackedAreaChart: () => ChartJSOptionsType = () => ({
  data: {
    labels: ['0', '1', '2', '3', '4', '5', '6', '7'],
    datasets: [
      // Wave A - Primary High
      {
        label: 'Wave A1',
        data: randomSmoothData(9, 60, 90),
        fill: true,
        borderColor: getColor('chart-gray'),
        backgroundColor: getColor('chart-gray-rgb', 0.2),
        tension: 0.5,
        pointRadius: 0,
        borderWidth: 2
      },
      // Wave A - Primary Low
      {
        label: 'Wave A2',
        data: randomSmoothData(9, 40, 65),
        fill: true,
        borderColor: getColor('chart-secondary'),
        backgroundColor: getColor('chart-secondary-rgb', 0.1),
        tension: 0.5,
        pointRadius: 0,
        borderWidth: 1
      },
      // Wave B - Secondary High
      {
        label: 'Wave B1',
        data: randomSmoothData(9, 30, 55),
        fill: true,
        borderColor: getColor('chart-primary'),
        backgroundColor: getColor('chart-primary-rgb', 0.2),
        tension: 0.5,
        pointRadius: 0,
        borderWidth: 2
      },
      // Wave B - Secondary Low
      {
        label: 'Wave B2',
        data: randomSmoothData(9, 15, 35),
        fill: true,
        borderColor: getColor('chart-dark'),
        backgroundColor: getColor('chart-dark-rgb', 0.1),
        tension: 0.5,
        pointRadius: 0,
        borderWidth: 1
      }
    ]

  },
    options: {
        interaction: {
            mode: 'index',
            intersect: false,
        },
    },
})

export const getBoundedAreaChart: () => ChartJSOptionsType = () => ({
    data: {
        labels: ['Jan', 'Feb', 'March', 'April', 'May', 'June'],
        datasets: [
            {
                label: 'Fully Rounded',
                data: [12.5, -19.4, 14.3, -15.0, 10.8, -10.5],
                borderColor: getColor('chart-primary'),
                fill: false,
            },
        ],
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
        },
    },
})

export const getDrawTimeChart: () => ChartJSOptionsType = () => ({
    data: {
        labels: ['Jan', 'Feb', 'March', 'April', 'May', 'June'],
        datasets: [
            {
                label: 'Fully Rounded',
                data: [10, 20, 15, 35, 38, 24],
                borderColor: getColor('chart-gray'),
                backgroundColor: getColor('chart-gray-rgb', 0.3),
                fill: true,
                borderWidth: 2,
            },
            {
                label: 'Small Radius',
                data: [24, 38, 35, 15, 20, 10],
                borderColor: getColor('chart-dark'),
                backgroundColor: getColor('chart-dark-rgb', 0.3),
                borderWidth: 2,
                tension: 0.2,
            },
        ],
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
        },
    },
})

export const getRadarChart: () => ChartJSOptionsType = () => ({
    data: {
        labels: ['Jan', 'Feb', 'March', 'April', 'May', 'June'],
        datasets: [
            {
                label: 'D0',
                data: [10, 20, 15, 35, 38, 24],
                borderColor: getColor('chart-primary'),
                fill: '-1',
                backgroundColor: getColor('chart-primary-rgb', 0.3),
                borderWidth: 2,
            },
            {
                label: 'D1',
                data: [12, 18, 18, 33, 41, 20],
                borderColor: getColor('chart-secondary'),
                fill: false,
                backgroundColor: getColor('chart-secondary-rgb', 0.3),
                borderWidth: 2,
            },
            {
                label: 'D2',
                data: [5, 25, 20, 25, 28, 14],
                borderColor: getColor('chart-dark'),
                fill: '-1',
                backgroundColor: getColor('chart-dark-rgb', 0.3),
                borderWidth: 2,
            },
            {
                label: 'D3',
                data: [12, 45, 15, 35, 38, 24],
                borderColor: getColor('chart-gray'),
                fill: '-1',
                backgroundColor: getColor('chart-gray-rgb', 0.3),
                borderWidth: 2,
            },
        ],
    },
    options: {
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    font: { family: getComputedStyle(document.body).fontFamily.trim()},
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
                        return `${ctx.dataset.label} - ${ctx.label}: ${ctx.parsed}`
                    },
                },
            },
        },
        scales: {
            x: { display: false },
            y: { display: false },
            r: {
                angleLines: {
                    color: getColor('border-color'),
                },
                grid: {
                    color: getColor('border-color'),
                },
                pointLabels: {
                    color: getColor('secondary-color'),
                    font: {
                        family:getComputedStyle(document.body).fontFamily.trim(),
                        size: 14,
                    },
                },
                ticks: {
                    font: { family:getComputedStyle(document.body).fontFamily.trim() },
                    color: getColor('secondary-color'),
                    backdropColor: 'transparent',
                },
            },
        },
    },
})