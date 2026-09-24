import Icon from "./Icon";

function Toast({ message }) {
  return (
    <div className="toast" role="status">
      <Icon name="check" size={15} />
      {message}
    </div>
  );
}

export default Toast;
