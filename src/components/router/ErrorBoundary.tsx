import classNames from 'classnames';
import React, { type FC, useEffect } from 'react';
import { useRouteError } from 'react-router-dom';

import loading from 'components/loading/loading';
import Page from 'components/Page';

interface ErrorBoundaryParams {
    pageClasses?: string[]
}

const ErrorBoundary: FC<ErrorBoundaryParams> = ({
    pageClasses = [ 'libraryPage' ]
}) => {
    const error = useRouteError() as Error;

    useEffect(() => {
        loading.hide();
    }, []);

    return (
        <Page
            id='errorBoundary'
            className={classNames('mainAnimatedPage', pageClasses)}
        >
            <div className='content-primary'>
                <section className='paperList' role='alert'>
                    <div className='listItemBody padded-left padded-right'>
                        <h2>{error.name}</h2>

                        <p>{error.message}</p>

                        {error.stack && (
                            <pre className='fieldDescription' style={{ maxHeight: '25rem', overflow: 'auto' }}>
                                {error.stack}
                            </pre>
                        )}
                    </div>
                </section>
            </div>
        </Page>
    );
};

export default ErrorBoundary;
