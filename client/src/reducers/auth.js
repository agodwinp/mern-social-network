import {
    REGISTER_SUCCESS,
    REGISTER_FAIL
} from '../actions/types';

const initialState = {
    token: localStorage.getItem('token'),
    isAuthenticated: null,
    loading: true, // this is to indicate whether we have the response and it's been loaded ==> it is currently loading (true)
    user: null
}

function authReducer(state = initialState, action) {
    const { type, payload } = action;

    switch(type) {
        case REGISTER_SUCCESS:
            localStorage.setItem('token', payload.token);
            return {
                ...state,
                ...payload,
                isAuthenticated: true,
                loading: false // we've got the response and it's been loaded ==> false
            }
        case REGISTER_FAIL:
            localStorage.removeItem('token');
            return {
                ...state,
                token: null,
                isAuthenticated: false,
                loading: false // we've got the response and it's been loaded ==> false
            }
        default:
            return state;

    }
}

export default authReducer;