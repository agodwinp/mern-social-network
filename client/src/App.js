import React, { Fragment, useEffect } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Routes from './components/routing/Routes'
import Navbar from './components/layout/Navbar'
import Landing from './components/layout/Landing'

// redux
import { Provider } from 'react-redux';
import store from './store';
import { loadUser } from './actions/auth';
import setAuthToken from './utils/setAuthToken';

import './App.css';

if (localStorage.token) {
	setAuthToken(localStorage.token);
}

const App = () => {
	useEffect(() => {
		store.dispatch(loadUser());
	}, []); // we use [] as the 2nd parameter to make sure this only runs once on refresh, not a continuous loop

	return (
		<Provider store={store}>
			<Router>
				<Fragment>
					<Navbar/>
					<Switch>
						<Route exact path="/" component={ Landing }/>
						<Route component={ Routes }/>
					</Switch>
				</Fragment>
			</Router>
		</Provider>
	);
}

export default App;
