const { calculateTimeAgo } = require("../utils/templatesUtils");

function findSelectionContentionCheck(array, labelToFind) {
  const foundObject = array.find((obj) => obj.question === labelToFind);
  return !!foundObject;
}

function generateCheckboxes(questStartData, item) {
  const isChecked = findSelectionContentionCheck(
    questStartData?.startQuestData &&
      questStartData.startQuestData.data.length > 0
      ? [
        {
          question:
            questStartData.startQuestData.data[
              questStartData.startQuestData.data.length - 1
            ].selected,
        },
      ]
      : [],
    item.question
  );

  const checkboxHTML = `
      <input 
        id="small-checkbox"
        type="checkbox"
        class="checkbox rounded-full h-[25px] w-[25px]"
        readonly=""
        ${isChecked ? "checked" : ""} 
      />
    `;

  return checkboxHTML;
}

const frameBinaryResultsHTML = (questStartData) => {
  const optionsHTML = questStartData.QuestAnswers.map((item) => {
    return `
            <div class="flex items-center pl-[3.94rem] pr-[6.3rem]">
      <div
        class="flex items-center justify-center bg-[#77797B] h-[49px] rounded-l-[10px] w-[25px] min-w-[25px]"
      ></div>
      <div
        class="flex w-full justify-between border-[#77797B] bg-[#293138] rounded-r-[10px] border-y-[3px] border-r-[3px] pointer-events-none"
      >
        <div class="relative flex w-full items-center">
          <div
            class="absolute top-0 block bg-[#4DD896] h-[10px]"
            style="width: ${questStartData?.selectedPercentage &&
        questStartData.selectedPercentage.length > 0
        ? questStartData.selectedPercentage[
        questStartData.selectedPercentage.length - 1
        ][item.question]
        : null
      }"
          ></div>
          <h1
            class="font-normal leading-none text-[#D3D3D3] py-3 pl-[18px] text-[19px]"
          >
            ${item.question}
          </h1>
        </div>

        <div
          class="flex items-center pr-[10px] gap-[22px] text-[16px] pointer-events-none"
        >
          <div class="flex items-center gap-1 laptop:gap-[18px]">
            <div id="custom-checkbox" class="flex h-full items-center">
              ${generateCheckboxes(questStartData, item)}
            </div>
            <span class="w-[4ch] whitespace-nowrap text-white"
              >${questStartData?.selectedPercentage &&
        questStartData.selectedPercentage.length > 0 &&
        questStartData.selectedPercentage[
        questStartData.selectedPercentage.length - 1
        ]?.[item.question] !== undefined
        ? questStartData.selectedPercentage[
        questStartData.selectedPercentage.length - 1
        ][item.question]
        : "0%"
      }</span
            >
          </div>
        </div>
      </div>
    </div>
          `;
  }).join("");

  const html = `
    <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
    <style>
      #custom-checkbox .checkbox {
        appearance: none;
        -webkit-appearance: none;
        background: transparent;
        border: 1px solid #0fb063;
        cursor: pointer;
        margin: 0;
        position: relative;
        outline: none;
      }

      #custom-checkbox .checkbox:focus-within {
        outline: none;
      }

      #custom-checkbox .checkbox:checked {
        background: #0fb063;
      }

      #custom-checkbox .checkbox::after {
  content: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 29 24' fill='none'><path d='M10.5991 22.3827C10.2865 22.7194 9.84371 23 9.45297 23C9.06223 23 8.61939 22.7054 8.29378 22.3686L1 14.5115L3.31838 12.014L9.46599 18.6365L25.7207 1L28 3.53954L10.5991 22.3827Z' fill='white' stroke='white' stroke-linejoin='round'/></svg>");
  display: none;
  width: 100%;
  height: 100%;
}

      #custom-checkbox .checkbox:checked::after {
        margin-top: 1px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* Custom Checkbox for popup */
      #custom-checkbox-popup .checkbox {
        appearance: none;
        -webkit-appearance: none;
        background: transparent;
        border: 1px solid #0fb063;
        cursor: pointer;
        margin: 0;
        position: relative;
        outline: none;
      }

      #custom-checkbox-popup .checkbox:focus-within {
        outline: none;
      }

      #custom-checkbox-popup .checkbox:checked {
        background: #0fb063;
      }

#custom-checkbox-popup .checkbox::after {
  content: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 29 24' fill='none'><path d='M10.5991 22.3827C10.2865 22.7194 9.84371 23 9.45297 23C9.06223 23 8.61939 22.7054 8.29378 22.3686L1 14.5115L3.31838 12.014L9.46599 18.6365L25.7207 1L28 3.53954L10.5991 22.3827Z' fill='white' stroke='white' stroke-linejoin='round'/></svg>");
  display: none;
  width: 100%;
  height: 100%;
}

      #custom-checkbox-popup .checkbox:checked::after {
        display: flex;
        align-items: center;
        justify-content: center;
      }
    </style>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body
    class="flex flex-col items-center justify-center gap-[25px] h-[353px] w-[675px]"
  >
<div
          class="w-full h-full border-2 border-[#77797B] bg-[#1B1F23] rounded-t-[15px]"
        >
        <div
        class="border-[#389CE3] border-b-[#389CE3] bg-[#389CE3] rounded-t-[14.5px] border-b-[1.85px] p-4"
      >
        <div class="relative flex items-center justify-center">
          <svg
            width="172"
            height="16"
            viewBox="0 0 172 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            class="w-auto h-auto"
          >
            <path
              d="M6.78 0.5H8.96C9.6 0.5 9.72 0.86 9.72 1.58C9.72 2.3 9.6 2.66 8.96 2.66H6.86C4.52 2.66 3.52 3.34 3.52 4.22V6.78H16.48C17.12 6.78 17.26 7.14 17.26 7.86C17.26 8.58 17.12 8.94 16.48 8.94H3.52V14.14C3.52 14.9 3.06 15.08 2.18 15.08C1.32 15.08 0.86 14.9 0.86 14.14V4.22C0.86 1.72 2.84 0.5 6.78 0.5ZM30 15H24.18C20.24 15 18.26 13.76 18.26 11.28V4.22C18.26 1.72 20.24 0.5 24.18 0.5H30C33.94 0.5 35.92 1.72 35.92 4.22V11.28C35.92 13.76 33.94 15 30 15ZM29.92 12.84C32.26 12.84 33.28 12.14 33.28 11.28V4.22C33.28 3.34 32.26 2.66 29.92 2.66H24.26C21.92 2.66 20.9 3.34 20.9 4.22V11.28C20.9 12.14 21.92 12.84 24.26 12.84H29.92ZM49.6197 15H43.4597C39.5197 15 37.5397 13.76 37.5397 11.28V1.36C37.5397 0.599999 37.9997 0.419999 38.8597 0.419999C39.7397 0.419999 40.1997 0.599999 40.1997 1.36V11.28C40.1997 12.14 41.1997 12.84 43.5397 12.84H49.5397C51.8797 12.84 52.8797 12.14 52.8797 11.28V1.36C52.8797 0.599999 53.3397 0.419999 54.2197 0.419999C55.0797 0.419999 55.5397 0.599999 55.5397 1.36V11.28C55.5397 13.76 53.5597 15 49.6197 15ZM74.0263 15.08C73.3063 15.08 73.1463 14.98 72.4463 14.4L60.0063 3.92V14.14C60.0063 14.9 59.5463 15.08 58.6663 15.08C57.8063 15.08 57.3463 14.9 57.3463 14.14V1.36C57.3463 0.619999 57.7863 0.419999 58.6063 0.419999C59.4863 0.419999 59.8663 0.639999 60.4863 1.16L72.7463 11.6V1.36C72.7463 0.599999 73.2063 0.419999 74.0663 0.419999C74.9463 0.419999 75.4063 0.599999 75.4063 1.36V14.14C75.4063 14.92 74.9463 15.08 74.0263 15.08ZM95.4677 4.22V11.28C95.4677 13.76 93.5077 15 89.5477 15H78.2077C77.5877 15 77.2877 14.68 77.2877 14.06V1.42C77.2877 0.799999 77.5877 0.5 78.2077 0.5H89.5477C93.5077 0.5 95.4677 1.72 95.4677 4.22ZM79.9477 2.66V12.84H89.4677C91.8077 12.84 92.8477 12.14 92.8477 11.28V4.22C92.8477 3.34 91.8077 2.66 89.4677 2.66H79.9477ZM105.668 0.439999C106.448 0.439999 106.908 0.699999 107.228 1.14L115.948 13.58C116.048 13.74 116.088 13.9 116.088 14.04C116.088 14.64 115.308 15.1 114.628 15.1C114.268 15.1 113.948 14.98 113.748 14.7L111.388 11.26H100.268L98.0478 14.7C97.8678 14.98 97.5278 15.1 97.1878 15.1C96.5278 15.1 95.7478 14.64 95.7478 14.02C95.7478 13.86 95.8078 13.72 95.8878 13.58L104.088 1.14C104.388 0.699999 104.868 0.439999 105.668 0.439999ZM105.668 2.88L101.648 9.1H109.908L105.668 2.88ZM127.869 2.66H121.829V14.14C121.829 14.9 121.369 15.08 120.489 15.08C119.629 15.08 119.169 14.9 119.169 14.14V2.66H113.149C112.509 2.66 112.369 2.3 112.369 1.58C112.369 0.86 112.509 0.5 113.149 0.5H127.869C128.509 0.5 128.649 0.86 128.649 1.58C128.649 2.3 128.509 2.66 127.869 2.66ZM132.487 1.36V14.14C132.487 14.9 132.027 15.08 131.147 15.08C130.287 15.08 129.827 14.9 129.827 14.14V1.36C129.827 0.599999 130.287 0.419999 131.147 0.419999C132.027 0.419999 132.487 0.599999 132.487 1.36ZM145.918 15H140.098C136.158 15 134.178 13.76 134.178 11.28V4.22C134.178 1.72 136.158 0.5 140.098 0.5H145.918C149.858 0.5 151.838 1.72 151.838 4.22V11.28C151.838 13.76 149.858 15 145.918 15ZM145.838 12.84C148.178 12.84 149.198 12.14 149.198 11.28V4.22C149.198 3.34 148.178 2.66 145.838 2.66H140.178C137.838 2.66 136.818 3.34 136.818 4.22V11.28C136.818 12.14 137.838 12.84 140.178 12.84H145.838ZM170.218 15.08C169.498 15.08 169.338 14.98 168.638 14.4L156.198 3.92V14.14C156.198 14.9 155.738 15.08 154.858 15.08C153.998 15.08 153.538 14.9 153.538 14.14V1.36C153.538 0.619999 153.978 0.419999 154.798 0.419999C155.678 0.419999 156.058 0.639999 156.678 1.16L168.938 11.6V1.36C168.938 0.599999 169.398 0.419999 170.258 0.419999C171.138 0.419999 171.598 0.599999 171.598 1.36V14.14C171.598 14.92 171.138 15.08 170.218 15.08Z"
              fill="white"
            />
          </svg>
        </div>
      </div>
      <div
        class="relative flex items-center justify-between border-b-2 border-[#77797B] px-5 py-[0.63rem]"
      >
        <div class="flex items-center gap-[14.36px]">
          ${questStartData?.moderationRatingCount === 0
      ? `<svg
                width="23"
                height="23"
                viewBox="0 0 23 23"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="0.461408"
                  y="0.461408"
                  width="22.0769"
                  height="22.0772"
                  rx="2.30704"
                  fill="#0FB063"
                  stroke="#0F5634"
                  stroke-width="0.922816"
                />
                <path
                  d="M16.5603 14.0867L16.0436 17.5195H6.18787V16.9658C6.69234 16.9658 7.06762 16.9351 7.3137 16.8736C7.57209 16.7997 7.74435 16.6459 7.83048 16.4122C7.92891 16.1784 7.97813 15.8215 7.97813 15.3417V7.64539C7.97813 7.17783 7.92891 6.82101 7.83048 6.57492C7.74435 6.32884 7.57209 6.16273 7.3137 6.0766C7.06762 5.99047 6.69234 5.94741 6.18787 5.94741V5.39372H15.8774L15.9882 8.42056H15.3976C15.3114 7.80535 15.1761 7.34394 14.9915 7.03633C14.8193 6.71642 14.5301 6.5011 14.1241 6.39036C13.7304 6.27962 13.1521 6.22425 12.3892 6.22425H9.67611V10.9122H11.8355C12.4015 10.9122 12.8321 10.8629 13.1274 10.7645C13.4228 10.6661 13.6258 10.4815 13.7365 10.2108C13.8472 9.94013 13.9026 9.5587 13.9026 9.06653H14.4932V13.3484H13.9026C13.9026 12.8439 13.8472 12.4686 13.7365 12.2226C13.6258 11.9765 13.4228 11.8165 13.1274 11.7427C12.8321 11.6689 12.4015 11.632 11.8355 11.632H9.67611V16.7075H12.057C12.7706 16.7075 13.3428 16.6767 13.7734 16.6152C14.2164 16.5413 14.5609 16.4122 14.807 16.2276C15.0654 16.043 15.2745 15.7785 15.4345 15.434C15.6067 15.0894 15.7852 14.6403 15.9697 14.0867H16.5603Z"
                  fill="white"
                />
              </svg>`
      : `<svg
                width="36"
                height="35"
                viewBox="0 0 36 35"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="1.2"
                  y="0.7"
                  width="33.6"
                  height="33.6"
                  rx="3.5"
                  fill="#DB0000"
                  stroke="#1E1111"
                  stroke-width="1.4"
                />
                <path
                  d="M28.492 27H20.96V26.16C21.24 26.16 21.5293 26.1413 21.828 26.104C22.1267 26.0667 22.3787 25.9733 22.584 25.824C22.7893 25.6747 22.892 25.4413 22.892 25.124C22.892 24.9187 22.8547 24.6853 22.78 24.424C22.724 24.144 22.6027 23.7987 22.416 23.388L21.324 20.868H14.156L12.896 23.836C12.8213 24.06 12.7467 24.284 12.672 24.508C12.616 24.7133 12.588 24.9467 12.588 25.208C12.588 25.6 12.7373 25.8613 13.036 25.992C13.3347 26.104 13.8107 26.16 14.464 26.16V27H8.584V26.16C9.10667 26.16 9.52667 26.076 9.844 25.908C10.1613 25.74 10.4693 25.404 10.768 24.9C11.0667 24.3773 11.44 23.584 11.888 22.52L17.824 8.464H18.972L25.608 23.668C26.0187 24.5827 26.4107 25.2267 26.784 25.6C27.176 25.9733 27.7453 26.16 28.492 26.16V27ZM20.904 19.748L17.824 11.908H17.74L14.576 19.748H20.904Z"
                  fill="white"
                />
              </svg>`
    }
          <h1
                class="relative font-medium text-white text-[1.2rem] leading-[1.2rem]"
              >
                ${questStartData?.QuestTopic}
              </h1>
        </div>
        <div
          class="flex h-4 w-fit items-center rounded-[0.625rem] md:h-[1.75rem] gap-2"
        >
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg"  class="h-[20.5px] w-[20.4px]">
<path id="Vector" d="M8.15784 16.6458C3.7029 16.6458 0.0791016 13.022 0.0791016 8.56702C0.0791016 4.11208 3.7029 0.488281 8.15784 0.488281C12.6128 0.488281 16.2366 4.11208 16.2366 8.56702C16.2366 13.022 12.6121 16.6458 8.15784 16.6458ZM8.15784 1.78088C4.41577 1.78088 1.3717 4.82495 1.3717 8.56702C1.3717 12.3091 4.41577 15.3532 8.15784 15.3532C11.8999 15.3532 14.944 12.3091 14.944 8.56702C14.944 4.82495 11.8993 1.78088 8.15784 1.78088ZM8.10614 9.16162H3.9569C3.78549 9.16162 3.6211 9.09352 3.49989 8.97232C3.37869 8.85112 3.3106 8.68673 3.3106 8.51532C3.3106 8.34391 3.37869 8.17952 3.49989 8.05831C3.6211 7.93711 3.78549 7.86902 3.9569 7.86902H7.45984V3.07348C7.45984 2.90207 7.52793 2.73768 7.64913 2.61648C7.77034 2.49527 7.93473 2.42718 8.10614 2.42718C8.27755 2.42718 8.44194 2.49527 8.56314 2.61648C8.68435 2.73768 8.75244 2.90207 8.75244 3.07348V8.51532C8.75244 8.68673 8.68435 8.85112 8.56314 8.97232C8.44194 9.09352 8.27755 9.16162 8.10614 9.16162Z" fill="#fff"/>
</svg>
          <h4
            class="whitespace-nowrap font-normal text-white text-[1.2rem] leading-[1.2rem]"
          >
          ${calculateTimeAgo(questStartData?.createdAt)}
          </h4>
        </div>
      </div>
          <div class="flex flex-col justify-between border-[#D9D9D9] pt-4 px-5">
            <div class="flex items-start justify-between border-[#D9D9D9]">
              <div class="flex flex-col gap-[18px]">
                <div class="flex items-start gap-4">
                  <div class="flex mt-[3px] gap-3 pr-6">
                    <h4
                      class="font-semibold text-[#DCDDDD] text-[1.25rem] leading-[23px]"
                    >
                      ${questStartData?.Question}
                    </h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="pb-6">
            <div
              class="flex items-start ml-[3.25rem] mr-[1.3rem] laptop:ml-[3.67rem]"
            ></div>
            <h4
              class="text-center font-normal text-[#85898C] max-h-[40px] min-h-[40px] text-[1rem]"
            >
              ​
            </h4>
            <div class="flex flex-col gap-[10px]">
              <div class="relative flex flex-col gap-[10px]">
               ${optionsHTML}
              </div>
            </div>
            <h4
              class="text-center font-normal text-[#85898C] py-[10px] text-[1rem] leading-[30px]"
            >
              ​
            </h4>
          </div>
          </div>
        </div>
  </body>
</html>
  `;

  return html;
};

module.exports = {
  frameBinaryResultsHTML,
};
