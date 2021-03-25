import { SET_ALERT, REMOVE_ALERT } from '../actions/types';

const initialState = [];

function alertReducer(state = initialState, action) {
    const { type, payload } = action;

    switch(type) {
        case SET_ALERT:
            return [...state, payload]; // state is immutable, therefore we need to take a copy of the current state before returning it
        case REMOVE_ALERT:
            return state.filter(alert => alert.id !== payload)
        default:
            return state;
    }
}

export default alertReducer;