type ExampleHeadingProps = {
  text: string;
};

export function ExampleHeading({ text }: ExampleHeadingProps) {
  return <h2>{text}</h2>;
}
