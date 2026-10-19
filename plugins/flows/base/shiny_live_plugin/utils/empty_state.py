"""Loading, no-data and error cards shown in place of a dashboard's charts."""
from shiny import ui, reactive, render

from error_state import (
    ERROR_STATE_TITLE,
    ERROR_STATE_SUBTITLE,
    ERROR_ICON_SVG,
    ERROR_STATE_CSS,
    error_state_icon,
    error_state_retry_button,
)

# Bar chart icon for the no-data card: a background bar shape under a 140x140 foreground.
EMPTY_STATE_ICON = ui.HTML("""
    <div class="empty-state-icon">
        <svg class="empty-state-icon-bg" xmlns="http://www.w3.org/2000/svg" width="107" height="87" viewBox="0 0 107 87" fill="none">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M4.7675 56.785C4.7675 55.3112 5.33875 53.9125 6.3725 52.85C7.43875 51.8125 8.8375 51.2412 10.3112 51.2412C11.7362 51.2412 13.095 51.7825 14.1138 52.7412L14.22 52.8787C15.2737 53.9037 15.8538 55.2912 15.8538 56.785V76.3162C15.8538 77.7425 15.3125 79.1012 14.3325 80.1375L14.2188 80.2513C13.1812 81.2887 11.795 81.8587 10.3112 81.8587C8.8375 81.8587 7.43875 81.2875 6.37625 80.2537C5.33875 79.1875 4.7675 77.79 4.7675 76.3162V56.785ZM44.5763 76.3163C44.5763 77.77 43.995 79.1687 42.9412 80.2513C41.92 81.2738 40.485 81.8587 39.005 81.8587C37.5213 81.8587 36.1338 81.2887 35.0988 80.2538C34.0425 79.1688 33.4613 77.77 33.4613 76.3163V32.8587C33.4613 31.3975 34.0575 29.9625 35.0975 28.9225C36.1512 27.8675 37.5387 27.2875 39.005 27.2875C40.4412 27.2875 41.7988 27.8375 42.8475 28.8538L42.9412 28.9225C43.98 29.9625 44.5763 31.3975 44.5763 32.8587V76.3163ZM62.155 43.8312C62.155 42.3575 62.7262 40.9587 63.76 39.8962C64.8262 38.8587 66.225 38.2875 67.6975 38.2875C69.1888 38.2875 70.6225 38.8825 71.635 39.9237C72.6888 40.9775 73.27 42.365 73.27 43.8312V76.3162C73.27 77.77 72.6888 79.1687 71.635 80.2513C70.6137 81.2738 69.1775 81.8587 67.6975 81.8587C66.225 81.8587 64.8262 81.2875 63.7637 80.2538C62.7262 79.1875 62.155 77.7887 62.155 76.3162V43.8312ZM90.5325 10.3113C90.5325 8.81875 91.1125 7.43125 92.17 6.4025C93.2138 5.33 94.6 4.74 96.0762 4.74C97.5413 4.74 98.9388 5.33 100.013 6.40375C101.068 7.45875 101.647 8.84625 101.647 10.3113V76.3163C101.647 77.7812 101.058 79.1787 99.9837 80.2513C98.9475 81.2887 97.56 81.8587 96.0762 81.8587C94.5825 81.8587 93.195 81.2788 92.1663 80.2225C91.1125 79.1963 90.5325 77.8088 90.5325 76.3163V10.3113ZM103.343 3.01875C101.426 1.0725 98.845 0 96.0762 0C93.3487 0 90.7588 1.07125 88.78 3.01875C86.8363 4.99375 85.765 7.585 85.765 10.3112V73.9313H78.01V43.8312C78.01 41.0912 76.9287 38.5013 74.9638 36.5363C73.0175 34.59 70.4375 33.5187 67.6975 33.5187C64.9587 33.5187 62.3687 34.6012 60.4025 36.5662C58.4575 38.5425 57.3862 41.1225 57.3862 43.8312V73.9313H49.3162V32.8587C49.3162 30.1113 48.215 27.4513 46.2988 25.5638L46.1525 25.4187C44.2413 23.5675 41.7025 22.5475 39.005 22.5475C36.2463 22.5475 33.655 23.6187 31.71 25.5638C29.7938 27.4825 28.6938 30.1413 28.6938 32.8587V73.9313H20.6225V56.785C20.6225 54.0575 19.5513 51.4675 17.5875 49.475L17.4587 49.3725C15.555 47.53 12.95 46.4725 10.3112 46.4725C7.58375 46.4725 4.99375 47.5437 3.01625 49.49C1.07 51.4362 0 54.0263 0 56.785V76.3163C0 79.0738 1.07 81.6637 3.0175 83.61C4.99375 85.5563 7.5825 86.6275 10.3112 86.6275C13.0387 86.6275 15.6275 85.5563 17.62 83.5938L17.7225 83.4625C18.995 82.1325 19.9013 80.4887 20.35 78.7H28.9913C29.41 80.5225 30.3462 82.2175 31.7113 83.61C33.6862 85.5563 36.2775 86.6275 39.005 86.6275C41.7313 86.6275 44.3225 85.5563 46.2988 83.61C47.645 82.2625 48.5925 80.5588 49.045 78.6712H57.6575C58.105 80.535 59.0638 82.2388 60.4325 83.61C62.3775 85.5563 64.9575 86.6275 67.6975 86.6275C70.4388 86.6275 73.0287 85.545 74.9912 83.5825C76.3325 82.2687 77.28 80.5837 77.7375 78.7H86.0363C86.4837 80.5338 87.43 82.2275 88.7825 83.61C90.7575 85.5563 93.3475 86.6275 96.0762 86.6275C98.8163 86.6275 101.408 85.545 103.369 83.5812C105.315 81.6662 106.387 79.0863 106.387 76.3163V10.3112C106.387 7.5425 105.305 4.95125 103.343 3.01875Z" fill="var(--Neutral-Light, #ACABA8)"/>
        </svg>
        <svg class="empty-state-icon-fg" xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 140 140" fill="none">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M78.8927 53.3037L78.9727 52.4175L79.2015 51.5612C79.5352 50.5637 80.1902 49.6937 81.0477 49.1125C81.9152 48.5062 82.9552 48.1712 83.9777 48.1712C84.4715 48.1712 84.974 48.2513 85.5402 48.4162L85.694 48.4775C86.1552 48.6312 86.5965 48.8662 87.0452 49.195L87.1577 49.2787C87.754 49.74 88.2502 50.3612 88.5927 51.0725C88.9127 51.7437 89.0902 52.53 89.0902 53.285C89.0902 54.6187 88.5465 55.9275 87.5977 56.8763C86.6352 57.8375 85.3502 58.3675 83.9777 58.3675C82.6715 58.3675 81.4027 57.865 80.5002 56.9912L80.3852 56.8763C79.4377 55.9275 78.8927 54.6187 78.8927 53.3037ZM107.271 17.3525C107.271 16.01 107.801 14.7225 108.763 13.7325C109.694 12.8025 111.013 12.2688 112.384 12.2688C113.746 12.2688 115.054 12.8113 115.975 13.7613C116.938 14.7225 117.468 15.9987 117.468 17.3525C117.468 18.7063 116.938 19.9825 115.974 20.9462C114.705 22.255 112.741 22.8025 110.939 22.2413C110.528 22.1388 110.113 21.9537 109.709 21.695L109.206 21.3612C108.638 20.9 108.159 20.315 107.825 19.675L107.77 19.5662C107.439 18.845 107.271 18.1 107.271 17.3525ZM58.2127 47.2312C56.7627 48.2463 54.8965 48.4475 53.219 47.7625L53.1015 47.7037C52.4802 47.4062 51.8902 46.965 51.444 46.46L51.274 46.2625C50.9402 45.8438 50.664 45.3387 50.4752 44.7987C50.2727 44.2525 50.1702 43.6675 50.1702 43.06C50.1702 41.725 50.7152 40.415 51.6627 39.4675C52.6252 38.505 53.9015 37.975 55.2552 37.975C56.5977 37.975 57.884 38.5062 58.8752 39.4675C59.8377 40.43 60.3677 41.705 60.3677 43.0425L60.3602 43.1437C60.3065 43.7775 60.2727 44.1962 60.0627 44.7738C59.7127 45.7687 59.0565 46.6413 58.2127 47.2312ZM21.4777 67.2725C21.4777 65.9287 22.0077 64.6425 22.969 63.6525C23.9177 62.7038 25.2265 62.16 26.5615 62.16C27.329 62.16 28.074 62.3213 28.7202 62.63C29.374 62.9175 29.9527 63.3612 30.4752 63.97L31.0015 64.7125L31.3652 65.5163C31.5777 66.2887 31.5877 66.3875 31.6615 67.1575L31.674 67.2725C31.674 68.6063 31.1302 69.915 30.1815 70.8638C29.2327 71.8125 27.914 72.3562 26.5615 72.3562C25.2465 72.3562 23.999 71.8662 23.0752 71.0013L22.969 70.8638C22.0215 69.915 21.4777 68.6063 21.4777 67.2725ZM19.7577 74.3675C21.5977 76.145 24.0127 77.1237 26.5615 77.1237C29.189 77.1237 31.6677 76.0925 33.5377 74.2225C35.3927 72.3988 36.4127 69.9313 36.4127 67.2725C36.4127 66.5575 36.3677 66.0213 36.269 65.5775L36.2665 65.4887C36.1852 64.975 36.0515 64.4563 35.849 63.885L35.3965 62.9038L49.489 51.0425C49.9427 51.3787 50.4902 51.7012 51.1152 52L51.2377 52.0612C52.5152 52.625 53.8677 52.9112 55.2552 52.9112C57.3265 52.9112 59.2927 52.2925 60.944 51.1213C61.9515 50.4025 62.8215 49.4987 63.4677 48.5012L74.204 52.3325L74.154 53.285C74.154 55.9437 75.1752 58.4113 77.0277 60.2337L77.174 60.38C79.0127 62.1575 81.429 63.1362 83.9777 63.1362C86.6052 63.1362 89.084 62.1063 90.954 60.235C92.8077 58.4113 93.829 55.9437 93.829 53.285C93.829 51.75 93.494 50.2687 92.8615 49.005C92.5965 48.4512 92.2527 47.8925 91.784 47.2575L108.316 26.3225L109.625 26.7938C110.548 27.07 111.449 27.205 112.384 27.205C115.013 27.205 117.48 26.1838 119.334 24.33C121.205 22.46 122.235 19.98 122.235 17.3525C122.235 14.7625 121.178 12.2188 119.334 10.375C117.48 8.52125 115.013 7.5 112.384 7.5C109.755 7.5 107.278 8.5325 105.406 10.4013C103.553 12.225 102.531 14.6937 102.531 17.3525C102.531 18.835 102.856 20.285 103.52 21.695L103.585 21.7762C103.854 22.34 104.195 22.8812 104.6 23.3862L88.0477 44.3112L87.0565 43.93C86.064 43.6 85.029 43.4325 83.9777 43.4325C81.9677 43.4325 80.0115 44.05 78.3165 45.2225C77.3227 45.9325 76.444 46.8363 75.7677 47.8438L65.0577 44.04L65.1065 43.06C65.1065 40.4188 64.0752 37.9513 62.2052 36.11C60.364 34.2388 57.8952 33.2075 55.2552 33.2075C52.6152 33.2075 50.1465 34.2387 48.3065 36.1087C46.4615 37.9237 45.4027 40.4575 45.4027 43.06C45.4027 44.165 45.6102 45.3 46.0215 46.44L46.424 47.3962L32.354 59.2912C31.839 58.9225 31.2927 58.6 30.7252 58.33C29.4277 57.7263 28.0265 57.42 26.5615 57.42C23.934 57.42 21.4665 58.4412 19.6115 60.2938C17.7402 62.165 16.709 64.6437 16.709 67.2725C16.709 69.9125 17.7402 72.3812 19.6115 74.2213L19.7577 74.3675Z" fill="var(--Neutral-Lighter, #DEDCDA)"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M21.0175 102.658C21.0175 101.184 21.5887 99.7855 22.6225 98.723C23.6887 97.6855 25.0875 97.1143 26.5612 97.1143C27.9862 97.1143 29.345 97.6555 30.3638 98.6143L30.47 98.7518C31.5237 99.7768 32.1038 101.164 32.1038 102.658V122.189C32.1038 123.616 31.5625 124.974 30.5825 126.011L30.4688 126.124C29.4312 127.162 28.045 127.732 26.5612 127.732C25.0875 127.732 23.6887 127.161 22.6262 126.127C21.5887 125.061 21.0175 123.663 21.0175 122.189V102.658ZM60.8263 122.189C60.8263 123.643 60.245 125.042 59.1912 126.124C58.17 127.147 56.735 127.732 55.255 127.732C53.7713 127.732 52.3838 127.162 51.3488 126.127C50.2925 125.042 49.7113 123.643 49.7113 122.189V78.7318C49.7113 77.2705 50.3075 75.8355 51.3475 74.7955C52.4012 73.7405 53.7887 73.1605 55.255 73.1605C56.6912 73.1605 58.0488 73.7105 59.0975 74.7268L59.1912 74.7955C60.23 75.8355 60.8263 77.2705 60.8263 78.7318V122.189ZM78.405 89.7043C78.405 88.2305 78.9762 86.8318 80.01 85.7693C81.0762 84.7318 82.475 84.1605 83.9475 84.1605C85.4388 84.1605 86.8725 84.7555 87.885 85.7968C88.9388 86.8505 89.52 88.238 89.52 89.7043V122.189C89.52 123.643 88.9388 125.042 87.885 126.124C86.8637 127.147 85.4275 127.732 83.9475 127.732C82.475 127.732 81.0762 127.161 80.0137 126.127C78.9762 125.061 78.405 123.662 78.405 122.189V89.7043ZM106.783 56.1843C106.783 54.6918 107.363 53.3043 108.42 52.2755C109.464 51.203 110.85 50.613 112.326 50.613C113.791 50.613 115.189 51.203 116.263 52.2768C117.318 53.3318 117.897 54.7193 117.897 56.1843V122.189C117.897 123.654 117.308 125.052 116.234 126.124C115.198 127.162 113.81 127.732 112.326 127.732C110.833 127.732 109.445 127.152 108.416 126.096C107.363 125.069 106.783 123.682 106.783 122.189V56.1843ZM119.593 48.8918C117.676 46.9455 115.095 45.873 112.326 45.873C109.599 45.873 107.009 46.9443 105.03 48.8918C103.086 50.8668 102.015 53.458 102.015 56.1843V119.804H94.26V89.7043C94.26 86.9643 93.1787 84.3743 91.2138 82.4093C89.2675 80.463 86.6875 79.3918 83.9475 79.3918C81.2087 79.3918 78.6187 80.4743 76.6525 82.4393C74.7075 84.4155 73.6362 86.9955 73.6362 89.7043V119.804H65.5662V78.7318C65.5662 75.9843 64.465 73.3243 62.5488 71.4368L62.4025 71.2918C60.4913 69.4405 57.9525 68.4205 55.255 68.4205C52.4963 68.4205 49.905 69.4918 47.96 71.4368C46.0438 73.3555 44.9438 76.0143 44.9438 78.7318V119.804H36.8725V102.658C36.8725 99.9305 35.8013 97.3405 33.8375 95.348L33.7087 95.2455C31.805 93.403 29.2 92.3456 26.5612 92.3456C23.8337 92.3456 21.2438 93.4168 19.2663 95.363C17.32 97.3093 16.25 99.8993 16.25 102.658V122.189C16.25 124.947 17.32 127.537 19.2675 129.483C21.2438 131.429 23.8325 132.501 26.5612 132.501C29.2887 132.501 31.8775 131.429 33.87 129.467L33.9725 129.336C35.245 128.006 36.1513 126.362 36.6 124.573H45.2413C45.66 126.396 46.5962 128.091 47.9613 129.483C49.9362 131.429 52.5275 132.501 55.255 132.501C57.9813 132.501 60.5725 131.429 62.5488 129.483C63.895 128.136 64.8425 126.432 65.295 124.544H73.9075C74.355 126.408 75.3138 128.112 76.6825 129.483C78.6275 131.429 81.2075 132.501 83.9475 132.501C86.6888 132.501 89.2787 131.418 91.2412 129.456C92.5825 128.142 93.53 126.457 93.9875 124.573H102.286C102.734 126.407 103.68 128.101 105.033 129.483C107.007 131.429 109.598 132.501 112.326 132.501C115.066 132.501 117.658 131.418 119.619 129.454C121.565 127.539 122.637 124.959 122.637 122.189V56.1843C122.637 53.4155 121.555 50.8243 119.593 48.8918Z" fill="var(--Neutral-Light, #ACABA8)"/>
        </svg>
    </div>
""")

# Hexagon icon for the loading card; no clipPath, since the icon appears twice on the page.
LOADING_STATE_ICON = ui.HTML("""
    <svg class="empty-state-loading-icon" xmlns="http://www.w3.org/2000/svg" width="182" height="114" viewBox="0 0 182 114" fill="none" aria-hidden="true">
        <path d="M4.37856e-06 56.6893L3.79908 50.117L7.59109 43.5376L15.1822 43.5376L22.7803 43.5376L26.5723 50.117L30.3714 56.6893L26.5723 63.2687L22.7803 69.8411L15.1822 69.8411L7.59109 69.8411L3.79908 63.2687L4.37856e-06 56.6893Z" fill-rule="evenodd" clip-rule="evenodd" fill="#DEDCDA"/>
        <path d="M25.002 71.1639L28.794 77.7434L32.593 84.3157L40.1841 84.3157L47.7823 84.3157L51.5743 77.7433L55.3663 71.1639L51.5743 64.5916L47.7823 58.0122L40.1841 58.0122L32.593 58.0122L28.794 64.5916L25.002 71.1639Z" fill-rule="evenodd" clip-rule="evenodd" fill="#DEDCDA"/>
        <path d="M25.002 42.1581L28.794 48.7375L32.593 55.3098L40.1841 55.3098L47.7823 55.3098L51.5743 48.7375L55.3663 42.1581L51.5743 35.5857L47.7823 29.0063L40.1841 29.0063L32.593 29.0063L28.794 35.5857L25.002 42.1581Z" fill-rule="evenodd" clip-rule="evenodd" fill="#DEDCDA"/>
        <path d="M50.3789 85.6952L54.178 79.1228L57.97 72.5434L65.5682 72.5434L73.1592 72.5434L76.9512 79.1228L80.7503 85.6952L76.9512 92.2746L73.1592 98.8469L65.5682 98.8469L57.97 98.8469L54.178 92.2746L50.3789 85.6952Z" fill-rule="evenodd" clip-rule="evenodd" fill="#DEDCDA"/>
        <path d="M50.3789 56.6893L54.178 50.117L57.97 43.5376L65.5682 43.5376L73.1592 43.5376L76.9512 50.117L80.7503 56.6893L76.9512 63.2687L73.1592 69.8411L65.5682 69.8411L57.97 69.8411L54.178 63.2687L50.3789 56.6893Z" fill-rule="evenodd" clip-rule="evenodd" fill="#DEDCDA"/>
        <path d="M75.3799 100.17L79.1719 106.749L82.971 113.322L90.5621 113.322L98.1602 113.322L101.952 106.749L105.744 100.17L101.952 93.5975L98.1602 87.018L90.5621 87.018L82.971 87.018L79.1719 93.5975L75.3799 100.17Z" fill-rule="evenodd" clip-rule="evenodd" fill="#DEDCDA"/>
        <path d="M75.3799 71.1639L79.1719 77.7434L82.971 84.3157L90.5621 84.3157L98.1602 84.3157L101.952 77.7433L105.744 71.1639L101.952 64.5916L98.1602 58.0122L90.5621 58.0122L82.971 58.0122L79.1719 64.5916L75.3799 71.1639Z" fill-rule="evenodd" clip-rule="evenodd" fill="#DEDCDA"/>
        <path d="M75.3799 42.1581L79.1719 48.7375L82.971 55.3098L90.5621 55.3098L98.1602 55.3098L101.952 48.7375L105.744 42.1581L101.952 35.5857L98.1602 29.0063L90.5621 29.0063L82.971 29.0063L79.1719 35.5857L75.3799 42.1581Z" fill-rule="evenodd" clip-rule="evenodd" fill="#DEDCDA"/>
        <path d="M50.3789 27.6835L54.178 21.1111L57.97 14.5388L65.5682 14.5388L73.1592 14.5388L76.9512 21.1111L80.7503 27.6835L76.9512 34.2629L73.1592 40.8352L65.5682 40.8352L57.97 40.8352L54.178 34.2629L50.3789 27.6835Z" fill-rule="evenodd" clip-rule="evenodd" fill="#DEDCDA"/>
        <path d="M75.3799 13.1522L79.1719 19.7316L82.971 26.304L90.5621 26.304L98.1602 26.304L101.952 19.7316L105.744 13.1522L101.952 6.57988L98.1602 0.000474239L90.5621 0.000474571L82.971 0.000474903L79.1719 6.57988L75.3799 13.1522Z" fill-rule="evenodd" clip-rule="evenodd" fill="#DEDCDA"/>
        <path d="M100.757 85.6952L104.556 79.1228L108.348 72.5434L115.946 72.5434L123.537 72.5434L127.329 79.1228L131.128 85.6952L127.329 92.2746L123.537 98.8469L115.946 98.8469L108.348 98.8469L104.556 92.2746L100.757 85.6952Z" fill-rule="evenodd" clip-rule="evenodd" fill="#DEDCDA"/>
        <path d="M100.757 56.6893L104.556 50.117L108.348 43.5376L115.946 43.5376L123.537 43.5376L127.329 50.117L131.128 56.6893L127.329 63.2687L123.537 69.8411L115.946 69.8411L108.348 69.8411L104.556 63.2687L100.757 56.6893Z" fill-rule="evenodd" clip-rule="evenodd" fill="#DEDCDA"/>
        <path d="M125.759 71.1639L129.551 77.7434L133.35 84.3157L140.941 84.3157L148.532 84.3157L152.331 77.7433L156.13 71.1639L152.331 64.5916L148.532 58.0122L140.941 58.0122L133.35 58.0122L129.551 64.5916L125.759 71.1639Z" fill-rule="evenodd" clip-rule="evenodd" fill="#DEDCDA"/>
        <path d="M125.759 42.1581L129.551 48.7375L133.35 55.3098L140.941 55.3098L148.532 55.3098L152.331 48.7375L156.13 42.1581L152.331 35.5857L148.532 29.0063L140.941 29.0063L133.35 29.0063L129.551 35.5857L125.759 42.1581Z" fill-rule="evenodd" clip-rule="evenodd" fill="#DEDCDA"/>
        <path d="M100.757 27.6835L104.556 21.1111L108.348 14.5388L115.946 14.5388L123.537 14.5388L127.329 21.1111L131.128 27.6835L127.329 34.2629L123.537 40.8352L115.946 40.8352L108.348 40.8352L104.556 34.2629L100.757 27.6835Z" fill-rule="evenodd" clip-rule="evenodd" fill="#DEDCDA"/>
        <path d="M151.136 56.6893L154.935 63.2687L158.727 69.8411L166.325 69.8411L173.916 69.8411L177.708 63.2687L181.507 56.6893L177.708 50.117L173.916 43.5376L166.325 43.5376L158.727 43.5376L154.935 50.117L151.136 56.6893Z" fill-rule="evenodd" clip-rule="evenodd" fill="#DEDCDA"/>
    </svg>
""")

# Card background colour; keep in sync with the literal value in EMPTY_STATE_CSS.
EMPTY_STATE_BACKGROUND = "#FAF8F8"

# Styles for the loading, no-data and error cards and the disabled download toolbar.
EMPTY_STATE_CSS = """
    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        height: 100%;
        padding: 80px 24px;
        background: #FAF8F8;
    }
    /* Recolour the chart container only while it holds a state card. */
    .chart-container:has(.empty-state) {
        background: #FAF8F8;
    }
    .empty-state-icon {
        position: relative;
        width: 140px;
        height: 140px;
        flex-shrink: 0;
        aspect-ratio: 1 / 1;
        margin-bottom: 24px;
    }
    .empty-state-icon-fg {
        position: absolute;
        inset: 0;
    }
    .empty-state-icon-bg {
        position: absolute;
        top: 45.873px;
        left: 16.25px;
        width: 106.387px;
        height: 86.628px;
    }
    .empty-state-title {
        margin: 0 0 8px 0;
        color: var(--Neutral-Default, #595757);
        text-align: center;
        font-family: "IBM Plex Sans", sans-serif;
        font-size: 16px;
        font-style: normal;
        font-weight: 600;
        line-height: 150%;
    }
    .empty-state-subtitle {
        margin: 0;
        max-width: 480px;
        color: var(--Neutral-Default, #595757);
        text-align: center;
        font-family: "IBM Plex Sans", sans-serif;
        font-size: 16px;
        font-style: normal;
        font-weight: 400;
        line-height: 150%;
    }
    /* Hide the static loading placeholder once no_data_state has rendered. */
    #no_data_state:not(:empty) ~ .empty-state-placeholder {
        display: none;
    }
    /* Stop Shiny dimming the state cards while they recalculate. */
    #no_data_state.recalculating > * {
        opacity: 1;
    }
    .empty-state-loading-text {
        margin: 0;
        color: var(--Neutral-Default, #595757);
        text-align: center;
        font-family: "IBM Plex Sans", sans-serif;
        font-size: 16px;
        font-style: normal;
        font-weight: 400;
        line-height: 150%;
    }
    .empty-state-loading-icon {
        width: 182px;
        height: 114px;
        flex-shrink: 0;
        margin-bottom: 24px;
    }
    /* Staggered pulse across the loading icon's hexagons. */
    .empty-state-loading-icon path {
        animation: empty-state-loading-pulse 1.6s ease-in-out infinite;
    }
    .empty-state-loading-icon path:nth-child(4n + 2) { animation-delay: 0.2s; }
    .empty-state-loading-icon path:nth-child(4n + 3) { animation-delay: 0.4s; }
    .empty-state-loading-icon path:nth-child(4n + 4) { animation-delay: 0.6s; }
    @keyframes empty-state-loading-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.35; }
    }
    @media (prefers-reduced-motion: reduce) {
        .empty-state-loading-icon path {
            animation: none;
        }
    }
    .download-toolbar-wrapper {
        position: relative;
        display: inline-flex;
    }
    .download-toolbar-disabled-overlay {
        position: absolute;
        inset: 0;
        background: rgba(255, 255, 255, 0.6);
        cursor: not-allowed;
        border-radius: 4px;
    }
""" + ERROR_STATE_CSS


def wrap_download_toolbar(toolbar):
    """Wrap the download toolbar with an overlay that disables it while there is no data."""
    return ui.div(
        toolbar,
        ui.panel_conditional(
            "input.has_data_input === 'false'",
            ui.div(class_="download-toolbar-disabled-overlay"),
        ),
        class_="download-toolbar-wrapper",
    )


def hidden_has_data_input():
    """Hidden has_data_input that panel_conditional gates read; starts "false"."""
    return ui.div(
        ui.input_text("has_data_input", "", value="false"),
        style="display: none;",
    )


def empty_state_slot():
    """Hidden has_data_input and the no_data_state output, placed before the chart."""
    return [
        hidden_has_data_input(),
        ui.output_ui("no_data_state"),
    ]


def gate_chart_widget(widget):
    """Show the chart widget only while has_data_input is "true"."""
    return ui.panel_conditional(
        "input.has_data_input === 'true'",
        widget,
    )


def empty_state_card(style=""):
    """One state card for all charts, shown while there is no data, with a static loading placeholder."""
    return ui.panel_conditional(
        "input.has_data_input === 'false'",
        ui.div(
            ui.output_ui("no_data_state"),
            ui.div(loading_card(), class_="empty-state-placeholder"),
            style=f"{style}background: {EMPTY_STATE_BACKGROUND};",
        ),
    )


def state_card(title, subtitle, icon=EMPTY_STATE_ICON, action=None):
    """Icon, title and subtitle card, with an optional action element below."""
    return ui.div(
        icon,
        ui.p(title, class_="empty-state-title"),
        ui.p(subtitle, class_="empty-state-subtitle"),
        action,
        class_="empty-state",
    )


def loading_card(title="Loading data..."):
    """Loading icon and text card, the same size as state_card."""
    return ui.div(
        LOADING_STATE_ICON,
        ui.p(title, class_="empty-state-loading-text"),
        class_="empty-state",
        role="status",
    )


def register_empty_state(
    output,
    has_data,
    title="No data available",
    subtitle="Change your date range and conditions to update the dashboard.",
    error=None,
    error_title=ERROR_STATE_TITLE,
    error_subtitle=ERROR_STATE_SUBTITLE,
    error_icon_svg=ERROR_ICON_SVG,
    retry_input_id=None,
    retry_label="Retry",
    loading=None,
    loading_title="Loading data...",
):
    """Register the has_data_input sync and the no_data_state output (loading, error or empty card)."""
    error_icon = error_state_icon(error_icon_svg)

    @reactive.Effect
    def sync_has_data_input():
        """Copy has_data() into the hidden has_data_input."""
        ui.update_text("has_data_input", value="true" if has_data() else "false")

    # Render while hidden so the loading card shows during the first fetch.
    @output(suspend_when_hidden=False)
    @render.ui
    def no_data_state():
        """Loading card while fetching, error card after a failed fetch, else the no-data card."""
        if has_data():
            return None

        if loading is not None and loading():
            return loading_card(loading_title)

        if error is not None and error():
            retry_button = None
            if retry_input_id:
                retry_button = error_state_retry_button(retry_input_id, retry_label)
            return state_card(error_title, error_subtitle, error_icon, retry_button)

        return state_card(title, subtitle)
