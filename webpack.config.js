const path = require('path');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const {NODE_ENV} = process.env;

module.exports = {
    mode: NODE_ENV,
    entry: ['./src/index.jsx'],
    devtool: {development: 'inline-source-map'}[NODE_ENV],
    output: {
        path: path.join(__dirname, 'dist'),
        publicPath: '/',
        ...{
            development: {filename: 'bundle.js'},
            production: {filename: '[name].[chunkhash].js'},
        }[NODE_ENV],
    },
    module: {
        rules: [
            {
                test: /\.jsx?$/,
                exclude: /node_modules/,
                use: ['babel-loader'],
                include: path.join(__dirname, 'src'),
            },
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, 'css-loader'],
            },
            {
                test: /\.(jpe?g|png|gif|woff2?|eot|ttf|svg)$/,
                use: 'file-loader?limit=10000',
            },
        ],
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env': {NODE_ENV: JSON.stringify(NODE_ENV)},
            __DEV__: NODE_ENV == 'development',
        }),
        new (require('html-webpack-plugin'))({
            inject: false,
            template: require('html-webpack-template'),
            title: require('./package.json').name,
            favicon: path.resolve(__dirname, './favicon.ico'),
            appMountId: 'root',
            mobile: true,
            minify: {collapseWhitespace: true},
        }),
        new MiniCssExtractPlugin({
            filename: '[name].css',
            chunkFilename: '[id].css',
        }),
        new webpack.ProvidePlugin({
            _: 'lodash',
            React: 'react',
        }),
        ...{
            development: [
                new webpack.NamedModulesPlugin(),
                new webpack.HotModuleReplacementPlugin(),
                new webpack.NoEmitOnErrorsPlugin(),
            ],
            production: [
                new (require('terser-webpack-plugin'))({
                    parallel: true,
                    terserOptions: {
                        ecma: 6,
                    },
                }),
            ],
        }[NODE_ENV],
    ],
    resolve: {
        modules: [path.resolve('./src'), 'node_modules'],
        extensions: ['.js', '.jsx', '.css'],
    },
    devServer: {
        port: 4000,
        hot: true,
        open: true,
        historyApiFallback: true,
        proxy: {
            '/api': 'http://localhost:3000',
        },
    },
};
