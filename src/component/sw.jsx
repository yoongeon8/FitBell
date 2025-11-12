useEffect(() => {
    onMessage(messaging, payload => {
      const 포그라운드 메세지 = JSON.parse(payload!.data!.data);
      // 포그라운드는 각자 아래 코드 자유롭게 하면 됩니다. 
    });
  }, []);