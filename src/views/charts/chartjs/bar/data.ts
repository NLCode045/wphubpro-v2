import type {ChartJSOptionsType} from "@/types";
import {getColor} from "@/helpers/chart";

export const getBasicBarChart: () => ChartJSOptionsType = () => ({
    data: {
        labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
        datasets: [
            {
                data: [4, 4, 5, 6, 8, 5, 4, 6, 8, 5],
                backgroundColor: getColor('chart-primary'),
                borderRadius: 4,
                borderSkipped: false,
            },
        ],
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

export const getBorderRadiusBarChart: () => ChartJSOptionsType = () => ({
    data: {
        labels: ['Jan', 'Feb', 'March', 'April', 'May', 'June'],
        datasets: [
            {
                label: 'Fully Rounded',
                data: [12, -19, 14, -15, 12, -14],
                borderColor: getColor('chart-gray'),
                backgroundColor: getColor('chart-gray-rgb', 0.2),
                borderWidth: 2,
                borderRadius: Number.MAX_VALUE,
                borderSkipped: false,
            },
            {
                label: 'Small Radius',
                data: [-10, 19, -15, -8, 12, -7],
                borderColor: getColor('chart-primary'),
                backgroundColor: getColor('chart-primary-rgb', 0.2),
                borderWidth: 2,
                borderRadius: 5,
                borderSkipped: false,
            },
        ],
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

export const getFloatingBarChart: () => ChartJSOptionsType = () => ({
    data: {
        labels: ['Jan', 'Feb', 'March', 'April', 'May', 'June'],
        datasets: [
            {
                label: 'Fully Rounded',
                data: [12, -19, 14, -15, 12, -14],
                backgroundColor: getColor('chart-primary'),
            },
            {
                label: 'Small Radius',
                data: [-10, 19, -15, -8, 12, -7],
                backgroundColor: getColor('chart-gray'),
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

export const getHorizontalBarChart: () => ChartJSOptionsType = () => ({
    data: {
        labels: ['Jan', 'Feb', 'March', 'April'],
        datasets: [
            {
                label: 'Fully Rounded',
                data: [12, -19, 14, -15],
                borderColor: getColor('chart-gray'),
                backgroundColor: getColor('chart-gray-rgb', 0.2),
                borderWidth: 1,
            },
            {
                label: 'Small Radius',
                data: [-10, 19, -15, -8],
                borderColor: getColor('chart-primary'),
                backgroundColor: getColor('chart-primary-rgb', 0.2),
                borderWidth: 1,
            },
        ],
    },
    options: {
        indexAxis: 'y',
        elements: {
            bar: {
                borderWidth: 2,
            },
        },
        interaction: {
            mode: 'index',
            intersect: false,
        },
    },
})

export const getStackedBarChart: () => ChartJSOptionsType = () => ({
    data: {
        labels: ['Jan', 'Feb', 'March', 'April', 'May'],
        datasets: [
            {
                label: 'Dataset 1',
                data: [12, -19, 14, -15, 8, 10],
                backgroundColor: getColor('chart-gray'),
            },
            {
                label: 'Dataset 2',
                data: [-10, 19, -15, -8, 12, 6],
                backgroundColor: getColor('chart-secondary'),
            },
            {
                label: 'Dataset 3',
                data: [-5, 14, -10, -12, 7, 4],
                backgroundColor: getColor('chart-primary'),
            },
            {
                label: 'Dataset 4',
                data: [8, -12, 10, -6, 15, -3],
                backgroundColor: getColor('chart-dark'),
            },
        ],
    },
    options: {
        scales: {
            x: {
                stacked: true,
            },
            y: {
                stacked: true,
            },
        },
        plugins: {
            legend: {
                display: false,
            },
        },
    },
})

export const getStackedGroupedBarChart: () => ChartJSOptionsType = () => ({
    data: {
        labels: ['Jan', 'Feb', 'March', 'April'],
        datasets: [
            {
                label: 'Dataset 1',
                data: [12, -19, 14, -15],
                backgroundColor: getColor('chart-dark'),
                stack: 'Stack 0',
            },
            {
                label: 'Dataset 2',
                data: [-10, 19, -15, -8],
                backgroundColor: getColor('chart-primary'),
                stack: 'Stack 0',
            },
            {
                label: 'Dataset 3',
                data: [-10, 19, -15, -8],
                backgroundColor: getColor('chart-gray'),
                stack: 'Stack 1',
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

export const getVerticalBarChart: () => ChartJSOptionsType = () => ({
    data: {
        labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
        datasets: [
            {
                label: 'Dataset 1',
                data: [4, 4, 5, 6, 8, 5, 4, 6, 8, 5],
                backgroundColor: getColor('chart-dark'),
                borderRadius: 4,
                barThickness: 8,
            },
            {
                label: 'Dataset 2',
                data: [3, 5, 4, 7, 6, 5, 6, 7, 5, 4],
                backgroundColor: getColor('chart-primary'),
                borderRadius: 4,
                barThickness: 8,
            },
            {
                label: 'Dataset 3',
                data: [5, 3, 6, 4, 7, 6, 5, 4, 6, 7],
                backgroundColor: getColor('chart-secondary'),
                borderRadius: 4,
                barThickness: 8,
            },
        ],
    },
})