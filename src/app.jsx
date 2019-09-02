require('normalize.css');
require('bootstrap/dist/css/bootstrap.min.css');
require('./css/index.css');
import axios from 'axios';
import {autorun, observable} from 'mobx';
import {observer, Provider} from 'mobx-react';
import {Container, Spinner} from 'react-bootstrap';
import {Redirect, Route, Switch, withRouter} from 'react-router-dom';

const Login = () => <div>Please login...</div>;

const Main = () => <div>Main</div>;

@withRouter
@observer
class App extends React.Component {
    @observable token = localStorage.getItem('token') || null;
    @observable user = null;

    constructor(props) {
        super(props);
        this.api = axios.create({baseURL: '/api/'});
        this.api.interceptors.response.use(
            res => res,
            err => {
                if (err.response.status == 401) this.token = null;
                return Promise.reject(err);
            }
        );
    }

    componentDidMount() {
        this.autorun = autorun(async () => {
            const {token} = this;
            if (token) {
                localStorage.setItem('token', token);
                this.api.defaults.headers.Authorization = token;
                const {data} = await this.api.get('me');
                this.user = data;
            } else {
                localStorage.removeItem('token');
                delete this.api.defaults.headers.Authorization;
                this.user = null;
            }
        });
    }

    componentWillUnmount() {
        this.autorun();
    }

    render() {
        return (
            <Provider api={this.api}>
                {this.token ? (
                    this.user ? (
                        <Provider user={this.user}>
                            <Switch>
                                <Route component={Main} />
                            </Switch>
                        </Provider>
                    ) : (
                        <Container className="text-center">
                            <Spinner animation="border" variant="primary" />
                        </Container>
                    )
                ) : (
                    <Switch>
                        <Route path="/" component={Login} exact />
                        <Redirect to="/" />
                    </Switch>
                )}
            </Provider>
        );
    }
}

export {App};
