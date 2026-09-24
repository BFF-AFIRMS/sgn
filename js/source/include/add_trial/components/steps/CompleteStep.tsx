import React from 'react';
import { useDesignResult } from '../../contexts/DesignResultContext';

export const CompleteStep: React.FC = () => {
    const { savedTrialId } = useDesignResult();

    return (
        <div className="tw:p-6">
            <div className="page_title tw:mb-4">
                <h3 className="tw:font-bold tw:text-lg">Complete! Your trial was saved in the database.</h3>
            </div>
            <p>
                <span className="glyphicon glyphicon-ok-sign tw:text-green-600 tw:text-xl tw:mr-2"></span>
                The trial was saved successfully
            </p>
            <ul className="tw:list-disc tw:pl-6 tw:space-y-1.5 tw:my-4">
                <li>You may want to proceed to the trial detail page for the trial you just created.</li>
                <li>You can print barcodes for the plots or plants or tissue samples in this trial.</li>
                <li>You can add phenotypes for the plots or plants in this trial now.</li>
            </ul>
            <br />
            <div className="tw:flex tw:justify-center tw:gap-3">
                {savedTrialId && (
                    <a
                        id="create_trial_success_complete_button"
                        href={`/breeders/trial/${savedTrialId}`}
                        className="btn btn-primary"
                    >
                        The trial was saved to the database with no errors! Click here to view trial
                    </a>
                )}
                <a href="/breeders/trials" className="btn btn-default">
                    Browse All Trials
                </a>
            </div>
        </div>
    );
};
