import styles from '../styles/RoomHeader.module.css'

// 해당 컴포넌트만 렌더링되도록 분리 ㄱㄱ
const RoomHeader = (props) => {
    const {roomId, numberOfUsers} = props;
    

    return (
        <>
            <h2 id="room-header" className={styles.roomHeader}>방 번호  {roomId} - {numberOfUsers} 명</h2>
        </>
    )
}

export default RoomHeader;