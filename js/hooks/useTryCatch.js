import {useState} from "react";


export const useTryCatch = (callback) => {
    const [error, setError] = useState('')

    const fetching = async (...params) => {
        try {
            return await callback(...params)
        } catch (e) {
            if (e?.response?.data) {
                console.log(e.response.data)
                setError(e.response.data)
            }
            else {
                setError(e.message)
            }

        }
    }

    return [fetching, error]
}