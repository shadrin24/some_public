import {useState} from "react";

export const useFetchingGrpc = (receiveMode, callback, callbackGprc) => {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [dataLoad, setDataLoad] = useState(false)

    if (receiveMode === 'API') {
        const fetching = async (...params) => {
            setError('')
            try {
                setIsLoading(true)
                const response = await callback(...params)
                setDataLoad(true)
                return response
            } catch (e) {
                setError(e)
                return e.response
            } finally {
                setIsLoading(false)
            }
        }
        return [fetching, isLoading, dataLoad, error]
    }
    else if (receiveMode === 'GRPC') {

    }
}