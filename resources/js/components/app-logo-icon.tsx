import { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="neon" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ff4da6" />
                    <stop offset="100%" stopColor="#00f7ff" />
                </linearGradient>
            </defs>
            <path
                d="M50 5L90 30V70L50 95L10 70V30L50 5Z
                    M50 20L25 35V65L50 80L75 65V35L50 20Z"
                fill="url(#neon)"
            />
        </svg>
    );
}
